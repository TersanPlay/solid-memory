export const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
}).format(new Date());

export const currentYear = Number(today.slice(0, 4));
export const currentMonth = today.slice(5, 7);
