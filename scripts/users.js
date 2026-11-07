import 'dotenv/config';
import path from 'node:path';
import readline from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { ZodError } from 'zod';
import { ApiError } from '../server/api.js';
import { loadConfig } from '../server/config.js';
import { createDatabase, initializeDatabase } from '../server/db.js';
import { createUser, findUserByTarget, listUsers, resetUserPassword, updateUser, USER_ROLES } from '../server/users.js';

const HELP = `
Gerenciamento local de usuários do SoftProtocolo

Uso:
  npm run users -- help
  npm run users -- list
  npm run users -- create [opções]
  npm run users -- edit <id-ou-email> [opções]

Opções de criação:
  --name <nome>           Nome completo
  --email <email>         E-mail único
  --role <perfil>         admin, OPERATOR ou VIEWER (padrão: VIEWER)
  --password-stdin        Lê a senha da entrada padrão

Opções de edição:
  --name <nome>           Altera o nome
  --email <email>         Altera o e-mail
  --role <perfil>         Altera o perfil
  --active                Ativa o usuário
  --inactive              Desativa o usuário
  --reset-password        Redefine a senha e encerra sessões
  --password-stdin        Usa a entrada padrão com --reset-password

Exemplos:
  npm run users -- list
  npm run users -- create --name "Maria Souza" --email "maria@example.invalid" --role OPERATOR
  npm run users -- edit maria@example.invalid --name "Maria da Silva"
  npm run users -- edit <ID> --inactive
  npm run users -- edit <ID> --reset-password

O comando acessa diretamente o SQLite indicado por DATABASE_URL. Execute-o apenas
em um servidor autorizado. Senhas não são aceitas em argumentos de linha de comando.
`;

const valueFlags = new Set(['name', 'email', 'role']);
const booleanFlags = new Set(['active', 'inactive', 'reset-password', 'password-stdin', 'help']);

class CliUsageError extends Error {}

export function parseArguments(argv) {
  const args = [...argv];
  const command = args.shift() || 'help';
  const flags = {};
  const positionals = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith('--')) {
      positionals.push(argument);
      continue;
    }
    const name = argument.slice(2);
    if (valueFlags.has(name)) {
      const value = args[index + 1];
      if (value === undefined || value.startsWith('--')) throw new CliUsageError(`A opção --${name} exige um valor.`);
      flags[name] = value;
      index += 1;
      continue;
    }
    if (booleanFlags.has(name)) {
      flags[name] = true;
      continue;
    }
    throw new CliUsageError(`Opção não reconhecida: --${name}.`);
  }
  return { command, flags, positionals };
}

function renderUsers(users) {
  const rows = users.map((user) => ({
    ID: user.id,
    NOME: user.name,
    'E-MAIL': user.email,
    PERFIL: user.role,
    ATIVO: user.active ? 'sim' : 'não',
  }));
  const headers = ['ID', 'NOME', 'E-MAIL', 'PERFIL', 'ATIVO'];
  const widths = Object.fromEntries(headers.map((header) => [header, Math.max(header.length, ...rows.map((row) => String(row[header]).length))]));
  const line = (row) => headers.map((header) => String(row[header]).padEnd(widths[header])).join('  ').trimEnd();
  return [line(Object.fromEntries(headers.map((header) => [header, header]))), ...rows.map(line)].join('\n');
}

function isInteractive(input, output) {
  return input?.isTTY === true && output?.isTTY === true;
}

async function promptFields(input, output, questions) {
  const prompt = createInterface({ input, output });
  const answers = {};
  try {
    for (const question of questions) {
      const suffix = question.defaultValue === undefined ? '' : ` [${question.defaultValue}]`;
      const answer = await prompt.question(`${question.label}${suffix}: `);
      answers[question.name] = answer.trim() || question.defaultValue;
    }
  } finally {
    prompt.close();
  }
  return answers;
}

async function readHiddenPassword(input, output, label) {
  if (!isInteractive(input, output) || typeof input.setRawMode !== 'function') {
    throw new CliUsageError('A senha requer um terminal interativo ou --password-stdin.');
  }
  readline.emitKeypressEvents(input);
  output.write(`${label}: `);
  return new Promise((resolve, reject) => {
    let value = '';
    const wasRaw = input.isRaw;
    const cleanup = () => {
      input.off('keypress', onKeypress);
      input.setRawMode(Boolean(wasRaw));
      input.pause();
    };
    const onKeypress = (text, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        cleanup(); output.write('\n'); reject(new CliUsageError('Operação cancelada.')); return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        cleanup(); output.write('\n'); resolve(value); return;
      }
      if (key.name === 'backspace') {
        if (value.length) { value = value.slice(0, -1); output.write('\b \b'); }
        return;
      }
      if (text && !key.ctrl && !key.meta) { value += text; output.write('*'); }
    };
    input.setRawMode(true);
    input.resume();
    input.on('keypress', onKeypress);
  });
}

async function readPasswordFromStdin(input) {
  const chunks = [];
  for await (const chunk of input) chunks.push(Buffer.from(chunk));
  const value = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
  if (!value || /[\r\n]/.test(value)) throw new CliUsageError('A entrada padrão deve conter exatamente uma senha em uma linha.');
  return value;
}

async function collectPassword(flags, input, output, confirmation = true) {
  if (flags['password-stdin']) return readPasswordFromStdin(input);
  const password = await readHiddenPassword(input, output, 'Senha');
  if (!confirmation) return password;
  const confirmed = await readHiddenPassword(input, output, 'Confirme a senha');
  if (password !== confirmed) throw new CliUsageError('As senhas informadas não coincidem.');
  return password;
}

function validateRole(role) {
  const raw = String(role || 'VIEWER').trim();
  const normalized = raw.toLowerCase() === 'admin' ? 'admin' : raw.toUpperCase();
  if (!USER_ROLES.includes(normalized)) throw new CliUsageError(`Perfil inválido. Use ${USER_ROLES.join(', ')}.`);
  return normalized;
}

function writeUser(output, title, user) {
  output.write(`${title}\n${renderUsers([user])}\n`);
}

function formatError(error) {
  if (error instanceof ZodError) return error.issues.map((issue) => `${issue.path.join('.') || 'dados'}: ${issue.message}`).join('; ');
  if (error instanceof ApiError || error instanceof CliUsageError) return error.message;
  if (error?.code === 'P2002') return 'Já existe um usuário com esse e-mail.';
  if (error?.code === 'P2021' || /no such table/i.test(error?.message || '')) return 'Banco não preparado. Execute npm run db:migrate e npm run db:seed.';
  if (/SQLITE_BUSY|database is locked/i.test(error?.message || '')) return 'O banco está ocupado. Aguarde ou pare temporariamente a aplicação e tente novamente.';
  return error?.message || 'Não foi possível concluir a operação.';
}

async function handleCreate({ prisma, flags, positionals, input, output }) {
  if (positionals.length) throw new CliUsageError('O comando create não aceita argumentos posicionais.');
  if (flags.active || flags.inactive || flags['reset-password']) throw new CliUsageError('Opções de edição não podem ser usadas com create.');
  let values = { name: flags.name, email: flags.email, role: flags.role || 'VIEWER' };
  if ((!values.name || !values.email || !flags.role) && isInteractive(input, output)) {
    values = { ...values, ...await promptFields(input, output, [
      ...(!values.name ? [{ name: 'name', label: 'Nome completo' }] : []),
      ...(!values.email ? [{ name: 'email', label: 'E-mail' }] : []),
      ...(!flags.role ? [{ name: 'role', label: 'Perfil', defaultValue: 'VIEWER' }] : []),
    ]) };
  }
  if (!values.name || !values.email) throw new CliUsageError('Informe --name e --email ou use um terminal interativo.');
  values.role = validateRole(values.role);
  values.password = await collectPassword(flags, input, output);
  const user = await createUser(prisma, values);
  writeUser(output, 'Usuário criado:', user);
}

async function handleEdit({ prisma, flags, positionals, input, output }) {
  if (positionals.length !== 1) throw new CliUsageError('Informe exatamente um ID ou e-mail após edit.');
  if (flags.active && flags.inactive) throw new CliUsageError('Use apenas --active ou --inactive.');
  if (flags['password-stdin'] && !flags['reset-password']) throw new CliUsageError('--password-stdin exige --reset-password.');
  const target = positionals[0];
  let current = await findUserByTarget(prisma, target);
  const hasProfileChanges = flags.name !== undefined || flags.email !== undefined || flags.role !== undefined || flags.active || flags.inactive;
  const changes = {};

  if (!hasProfileChanges && !flags['reset-password']) {
    if (!isInteractive(input, output)) throw new CliUsageError('Informe ao menos uma alteração ou use um terminal interativo.');
    const answers = await promptFields(input, output, [
      { name: 'name', label: 'Nome completo', defaultValue: current.name },
      { name: 'email', label: 'E-mail', defaultValue: current.email },
      { name: 'role', label: 'Perfil', defaultValue: current.role },
      { name: 'active', label: 'Ativo? (s/n)', defaultValue: current.active ? 's' : 'n' },
    ]);
    changes.name = answers.name;
    changes.email = answers.email;
    changes.role = validateRole(answers.role);
    if (!['s', 'n'].includes(String(answers.active).toLowerCase())) throw new CliUsageError('Responda s ou n para a situação ativa.');
    changes.active = String(answers.active).toLowerCase() === 's';
  } else {
    if (flags.name !== undefined) changes.name = flags.name;
    if (flags.email !== undefined) changes.email = flags.email;
    if (flags.role !== undefined) changes.role = validateRole(flags.role);
    if (flags.active) changes.active = true;
    if (flags.inactive) changes.active = false;
  }

  if (Object.keys(changes).length) current = await updateUser(prisma, current.id, changes);
  if (flags['reset-password']) {
    const password = await collectPassword(flags, input, output);
    current = await resetUserPassword(prisma, current.id, { password });
  }
  writeUser(output, 'Usuário atualizado:', current);
}

export async function runUserCli(options = {}) {
  const argv = options.argv ?? process.argv.slice(2);
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const errorOutput = options.errorOutput ?? process.stderr;
  let prisma = options.prisma;
  const ownsDatabase = !prisma;

  try {
    const parsed = parseArguments(argv);
    if (['help', '--help', '-h'].includes(parsed.command) || parsed.flags.help) {
      output.write(HELP.trimStart());
      return 0;
    }
    if (!['list', 'create', 'edit'].includes(parsed.command)) throw new CliUsageError(`Comando desconhecido: ${parsed.command}. Use help.`);
    if (!prisma) {
      const config = loadConfig();
      prisma = createDatabase(config.databaseUrl);
      await initializeDatabase(prisma);
    }

    if (parsed.command === 'list') {
      if (parsed.positionals.length || Object.keys(parsed.flags).length) throw new CliUsageError('O comando list não aceita opções.');
      const users = await listUsers(prisma);
      output.write(users.length ? `${renderUsers(users)}\n` : 'Nenhum usuário cadastrado.\n');
    }
    if (parsed.command === 'create') await handleCreate({ prisma, ...parsed, input, output });
    if (parsed.command === 'edit') await handleEdit({ prisma, ...parsed, input, output });
    return 0;
  } catch (error) {
    errorOutput.write(`Erro: ${formatError(error)}\n`);
    return 1;
  } finally {
    if (ownsDatabase && prisma) await prisma.$disconnect();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  process.exitCode = await runUserCli();
}
