import { computeGrade, formatGrade } from "./grade.js";
import { triggerBlobDownload, sanitizeFileName } from "./download.js";

const BOM = "﻿";

function csvEscape(value) {
  const str = String(value ?? "");
  return /[;"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * Exporte la note finale de chaque élève en CSV (Nom;Prénom;Note), pour import dans
 * Hyperplanning. Séparateur point-virgule et décimales en virgule (mêmes conventions
 * que le reste de l'app, cf. `formatGrade`) : c'est ce qu'attend Excel en France, l'outil
 * généralement utilisé pour préparer un import Hyperplanning.
 */
export function exportGradesCsv(grid, students, getMarkFor) {
  const header = ["Nom", "Prénom", "Note"];
  const rows = students
    .slice()
    .sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name))
    .map((student) => {
      const getLevelPosition = (criterionId) => getMarkFor(student.id, criterionId)?.levelPosition ?? null;
      const grade = computeGrade(grid, getLevelPosition);
      return [student.last_name, student.first_name, formatGrade(grade.grade20)];
    });

  const lines = [header, ...rows].map((cols) => cols.map(csvEscape).join(";"));
  // Le BOM UTF-8 en tête garantit qu'Excel affiche correctement les accents à l'ouverture.
  const blob = new Blob([BOM + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  triggerBlobDownload(blob, `${sanitizeFileName(grid.name)}_notes.csv`);
}
