import fs from "fs";
import path from "path";
import { createClient } from "@/utils/supabase/server";

function getLocalFilePath(filename) {
  return path.join(process.cwd(), "data", filename);
}

/** Read a local JSON array store under data/. */
export function getLocalRecords(filename = "local-leads.json") {
  const filePath = getLocalFilePath(filename);
  try {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, "[]", "utf-8");
      return [];
    }
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(`Failed to read ${filename}:`, e);
    return [];
  }
}

/** Upsert a lead record into the local JSON store. */
export function saveLocalLead(lead) {
  const filePath = getLocalFilePath("local-leads.json");
  try {
    const list = getLocalRecords("local-leads.json");
    const idx = list.findIndex(
      (l) => l.email && lead.email && l.email.toLowerCase() === lead.email.toLowerCase()
    );
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...lead, updated_at: new Date().toISOString() };
    } else {
      list.unshift(lead);
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf-8");
    return list;
  } catch (e) {
    console.error("Failed to save local lead:", e);
  }
}

/** Remove a record by ID from a local JSON store; returns true if removed. */
export function deleteLocalRecord(id, filename = "local-leads.json") {
  const filePath = getLocalFilePath(filename);
  try {
    if (!fs.existsSync(filePath)) return false;
    const list = JSON.parse(fs.readFileSync(filePath, "utf-8") || "[]");
    if (!Array.isArray(list)) return false;
    const filtered = list.filter((item) => String(item.id) !== String(id));
    if (filtered.length === list.length) return false;
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error(`Failed to delete from ${filename}:`, e);
    return false;
  }
}

/** Delete a CRM record from its local JSON store and Supabase. */
export async function deleteCrmRecord({ table, id, localFile }) {
  if (!id) {
    return { ok: false, status: 400, error: "Record ID is required" };
  }

  const removedLocally = localFile ? deleteLocalRecord(id, localFile) : false;

  let supabaseError = null;
  let supabaseSucceeded = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      supabaseError = error;
    } else {
      supabaseSucceeded = true;
    }
  } catch (err) {
    supabaseError = err;
  }

  if (removedLocally || supabaseSucceeded) {
    return { ok: true, status: 200, deletedId: id };
  }

  return {
    ok: false,
    status: 500,
    error: supabaseError?.message || `Failed to delete record from ${table}`,
  };
}
