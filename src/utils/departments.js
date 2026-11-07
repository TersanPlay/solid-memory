export function emptyDepartmentForm() {
  return { name: "", code: "" };
}

export function departmentReferenceCount(department, documents = []) {
  return documents.filter(
    (doc) =>
      doc.originDepartmentId === department.id ||
      doc.destinationDepartmentId === department.id,
  ).length;
}
