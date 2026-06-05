// Server-only helpers for talking to the Google Sheets connector gateway.
// NEVER import this from client code (file is suffixed *.server.ts to be safe).

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
export const SPREADSHEET_ID = "1lpCiG-kkx7Tcpb7MCDrfXj6r3kQIUyPdiReci0Ntmjs";

function headers() {
  const apiKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey || !connKey) {
    throw new Error("Google Sheets connector secrets are not configured");
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    "X-Connection-Api-Key": connKey,
    "Content-Type": "application/json",
  };
}

async function gw(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets gateway ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function readRange(range: string): Promise<string[][]> {
  const data = await gw(`/spreadsheets/${SPREADSHEET_ID}/values/${range}`);
  return (data.values as string[][]) ?? [];
}

export async function appendRow(sheet: string, row: (string | number)[]) {
  await gw(
    `/spreadsheets/${SPREADSHEET_ID}/values/${sheet}!A:Z:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [row] }) },
  );
}

export async function updateRow(sheet: string, rowIndex: number, row: (string | number)[]) {
  // rowIndex is 1-based sheet row (header is row 1, data starts at row 2)
  await gw(
    `/spreadsheets/${SPREADSHEET_ID}/values/${sheet}!A${rowIndex}?valueInputOption=USER_ENTERED`,
    { method: "PUT", body: JSON.stringify({ values: [row] }) },
  );
}

// Resolve the numeric sheetId required by deleteDimension requests.
let sheetIdCache: Record<string, number> | null = null;
async function refreshSheetIds() {
  const meta = await gw(`/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`);
  sheetIdCache = {};
  for (const s of meta.sheets ?? []) {
    sheetIdCache[s.properties.title] = s.properties.sheetId;
  }
}
async function getSheetId(title: string): Promise<number> {
  if (!sheetIdCache) await refreshSheetIds();
  const id = sheetIdCache![title];
  if (id === undefined) throw new Error(`Sheet "${title}" not found`);
  return id;
}

// Create the sheet (with header row) if it does not exist.
export async function ensureSheet(title: string, headerRow: string[]) {
  if (!sheetIdCache) await refreshSheetIds();
  if (sheetIdCache![title] !== undefined) return;
  await gw(`/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title } } }],
    }),
  });
  sheetIdCache = null; // invalidate
  await gw(
    `/spreadsheets/${SPREADSHEET_ID}/values/${title}!A1?valueInputOption=USER_ENTERED`,
    { method: "PUT", body: JSON.stringify({ values: [headerRow] }) },
  );
}

export async function deleteRow(sheet: string, rowIndex: number) {
  const sheetId = await getSheetId(sheet);
  await gw(`/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1, // 0-based, inclusive
              endIndex: rowIndex,       // exclusive
            },
          },
        },
      ],
    }),
  });
}

// Convert a sheet's rows into objects keyed by header names.
// Returns objects augmented with `_row` = 1-based sheet row number (header is 1).
export async function readObjects<T extends Record<string, string>>(
  sheet: string,
): Promise<(T & { _row: number })[]> {
  const rows = await readRange(`${sheet}!A1:Z`);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const out: (T & { _row: number })[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c) => !c)) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = r[idx] ?? ""));
    out.push({ ...(obj as T), _row: i + 1 });
  }
  return out;
}
