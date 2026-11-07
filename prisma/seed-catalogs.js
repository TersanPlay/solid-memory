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
  { name: "ASSESSORIA DE COMUNICACAO", code: "DEP-COMUN" },
  { name: "BIBLIOTECA LEGISLATIVA", code: "DEP-BIBLIOTECA" },
  { name: "CEDIDOS/OUTROS ORGAOS", code: "DEP-CEDIDOS" },
  { name: "CONTABILIDADE", code: "DEP-CONTABILIDADE" },
  { name: "CONTROLADORIA INTERNA", code: "DEP-CONTROLADORIA" },
  { name: "DEPART. DE POLICIA LEGISLATIVA", code: "DEP-POLICIA-LEGISLATIVA" },
  { name: "DEPARTAMENTO DE AUTOMACAO", code: "DEP-AUTOMACAO" },
  { name: "DEPARTAMENTO DE COMPRAS", code: "DEP-COMPRAS" },
  { name: "DEPARTAMENTO DE MATERIAIS E SERVICOS", code: "DEP-MATERIAIS" },
  { name: "DEPARTAMENTO DE PLANEJAMENTO DE CONTRATACOES", code: "DEP-CONTRATACOES" },
  { name: "DEPARTAMENTO DE RADIO E TV", code: "DEP-RADIO-TELEVISAO" },
  { name: "DIRETORIA ADMINISTRATIVA", code: "DIR-AADM" },
  { name: "DIRETORIA FINANCEIRA", code: "DIR-FIN" },
  { name: "DIRETORIA LEGISLATIVA", code: "DIR-LEG" },
  { name: "ESCOLA DO LEGISLATIVO", code: "ESCOLA-LEGISLATIVO" },
  { name: "GAB. VER. ALEX OHANA", code: "GAB-AOHANA" },
  { name: "GAB. VER. ANDERSON MARCOS MORATORIO", code: "GAB-ANDR" },
  { name: "GAB. VER. ELEOMARCIO ALMEIDA DE LIMA", code: "GAB-ELEMAR" },
  { name: "GAB. VER. ELIMARCIO ALMEIDA DE LIMA", code: "GAB-ELIMARCIO" },
  { name: "GAB. VER. ELIAS FERREIRA DE ALMEIDA FILHO", code: "GAB-ELIAS" },
  { name: "GAB. VER. ELVIS SILVA CRUZ", code: "GAB-ELVIS" },
  { name: "GAB. VER. ERICA RIBEIRO", code: "GAB-ERICA" },
  { name: "GAB. VER. FRANCISCO ELOECIO SILVA LIMA", code: "GAB-FRAN" },
  { name: "GAB. VER. FRED SANCAO", code: "GAB-FRED" },
  { name: "GAB. VER. GRACIELE BRITO", code: "GAB-GRACIELE" },
  { name: "GAB. VER. LAECIO DA ACT", code: "GAB-LAECIO" },
  { name: "GAB. VER. LEONARDO DA SILVA MENDES", code: "GAB-LEONARDO" },
  { name: "GAB. VER. MAQUIVALDA", code: "GAB-MAQUIVALDA" },
  { name: "GAB. VER. MICHEL CARTEIRO", code: "GAB-MICHEL" },
  { name: "GAB. VER. SADISVAN", code: "GAB-SADISVAN" },
  { name: "GAB. VER. SARGENTO NOGUEIRA", code: "GAB-SARGENTO" },
  { name: "GAB. VER. TITO DO MST", code: "GAB-TITO" },
  { name: "GAB. VER. ZE DA LATA", code: "GAB-ZE" },
  { name: "ILCM - INSTITUTO LEGISLATIVO MUNICIPAL", code: "ILCM" },
  { name: "LICITACAO", code: "LIC" },
  { name: "OUVIDORIA LEGISLATIVA", code: "OUVI" },
  { name: "PRESIDENCIA", code: "PRES" },
  { name: "PROCURADORIA", code: "PROC" },
  { name: "SIC-SERVICO DE INFORMACAO AO CIDADAO", code: "SIC" },
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
