// Minimal CSV export/import utilities used by admin service.
const EOL = '\n';

function objectsToCsv(list, fields) {
    const header = fields.join(',');
    const rows = list.map(obj => {
        return fields
            .map(f => {
                const v = obj[f] == null ? '' : String(obj[f]).replace(/"/g, '""');
                // wrap in quotes if contains comma or quote or newline
                if (/[",\n]/.test(v)) return `"${v}"`;
                return v;
            })
            .join(',');
    });
    return header + EOL + rows.join(EOL);
}

function csvToObjects(text) {
    if (!text) return [];
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];
    const header = parseCsvLine(lines[0]);
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        const obj = {};
        for (let j = 0; j < header.length; j++) {
            obj[header[j]] = row[j] || '';
        }
        data.push(obj);
    }
    return data;
}

function parseCsvLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cur += ch;
            }
        } else {
            if (ch === ',') {
                result.push(cur);
                cur = '';
            } else if (ch === '"') {
                inQuotes = true;
            } else {
                cur += ch;
            }
        }
    }
    result.push(cur);
    return result;
}

module.exports = { objectsToCsv, csvToObjects };
