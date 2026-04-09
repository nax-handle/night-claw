import { writeSection, appendToSection, deleteSection, clearAllSections } from "./claude-md.js";

export type UpdateNotesAction = "rewrite" | "append" | "delete";

export async function updateNotes(
  section: string,
  content: string,
  action: UpdateNotesAction,
): Promise<string> {
  switch (action) {
    case "rewrite":
      await writeSection(section, content);
      return `Updated "${section}" section.`;

    case "append":
      await appendToSection(section, content);
      return `Added to "${section}" section.`;

    case "delete":
      if (content.toLowerCase().includes("everything") || content === "*") {
        await clearAllSections();
        return "Cleared all notes. Fresh start.";
      }
      await deleteSection(section);
      return `Removed "${section}" from notes.`;

    default:
      return "Unknown action.";
  }
}
