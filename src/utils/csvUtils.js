export const parseCSV = (text) => {
  // Detect delimiter (comma or tab)
  const delimiter = text.includes("\t") ? "\t" : ",";

  const lines = text.trim().split("\n");
  const headers = lines[0].split(delimiter).map(h => h.trim());

  const rows = lines.slice(1).map(line => {
    const values = line.split(delimiter);
    return headers.reduce((obj, header, idx) => {
      obj[header] = values[idx]?.trim() || "";
      return obj;
    }, {});
  });

  return { headers, rows, delimiter };
};

export const buildCSV = (headers, rows, delimiter = ",") => {
  const csvRows = [
    headers.join(delimiter),
    ...rows.map(row => headers.map(header => row[header] ?? "").join(delimiter))
  ];
  return csvRows.join("\n");
};
