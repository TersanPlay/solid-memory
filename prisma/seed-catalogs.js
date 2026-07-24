export const defaultDocumentTypes = [
  { name: "Memorando", prefix: "MEMO", digits: 3 },
  { name: "Ofício", prefix: "OFC", digits: 3 },
  { name: "Circular", prefix: "CIR", digits: 3 },
  {
    name: "Comunicado Interno",
    prefix: "CI",
    digits: 3,
  },
  { name: "Ordem de Serviço", prefix: "OS", digits: 3 },
  { name: "Laudo Técnico", prefix: "LT", digits: 3 },
  { name: "Parecer Técnico", prefix: "PR", digits: 3 },
];

export const defaultDepartments = [
  { name: "Departamento de Arquivo", code: "DEP-ARQUIVO" },
  { name: "Departamento de Almoxarifado", code: "DEP-ALMOXARIFADO" },
  { name: "Tecnologia da Informação", code: "DEP-TI" },
  { name: "Gestão de Pessoas", code: "DEP-PESSOAS" },
  { name: "Departamento Financeiro", code: "DEP-FINANCEIRO" },
  { name: "Patrimônio e Manutenção", code: "DEP-PATRIMONIO" },
];

export async function seedCatalogs(prisma) {
  return prisma.$transaction(async (transaction) => {
    const typeCount = await transaction.documentType.count();
    let typesCreated = 0;
    if (typeCount === 0) {
      const result = await transaction.documentType.createMany({
        data: defaultDocumentTypes,
      });
      typesCreated = result.count;
    }

    const departmentCount = await transaction.department.count();
    let departmentsCreated = 0;
    if (departmentCount === 0) {
      const result = await transaction.department.createMany({
        data: defaultDepartments,
      });
      departmentsCreated = result.count;
    }

    return { typesCreated, departmentsCreated };
  });
}
