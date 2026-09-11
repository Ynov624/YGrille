import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import { computeGrade, computeCategoryGrades, criterionPoints, formatGrade, formatPoints } from "./grade.js";
import { LEVEL_COLORS } from "./defaults.js";
import { triggerBlobDownload, sanitizeFileName } from "./download.js";

const ACCENT = "#4E6DC9";
const INK = "#14161C";
const MUTED = "#6B7080";
const BORDER = "#DCDFE6";

const PAGE_WIDTH = 297; // A4 paysage, mm
const PAGE_HEIGHT = 210;
const MARGIN_X = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const ACCENT_RGB = hexToRgb(ACCENT);
const INK_RGB = hexToRgb(INK);
const MUTED_RGB = hexToRgb(MUTED);
const BORDER_RGB = hexToRgb(BORDER);

function levelLabelFor(grid, position) {
  const level = grid.levels.find((l) => l.position === position);
  return level ? level.label : "Non évalué";
}

function fileNameFor(grid, student) {
  return sanitizeFileName(`${student.last_name}_${student.first_name}_${grid.name}`) + ".pdf";
}

/**
 * Construit le PDF (jsPDF, paysage) d'une évaluation complète pour un élève,
 * sous forme de tableau par catégorie (Critère / Niveau / Points / Appréciation),
 * avec la palette de couleurs de l'application (accent + couleurs de niveaux).
 * `getMark(criterionId)` renvoie `{ levelPosition, comment }` ou null si le
 * critère n'est pas encore évalué. Les points affichés sont toujours dérivés
 * du niveau (poids × barème), jamais saisis.
 */
export function buildStudentPdf(grid, student, getMark) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let y = 20;

  const getLevelPosition = (criterionId) => getMark(criterionId)?.levelPosition ?? null;
  const overall = computeGrade(grid, getLevelPosition);
  const categoryGrades = computeCategoryGrades(grid, getLevelPosition);

  const newPageIfNeeded = (needed) => {
    if (y + needed > PAGE_HEIGHT - 15) {
      doc.addPage();
      y = 20;
    }
  };

  // Bandeau d'accent en haut de page
  doc.setFillColor(...ACCENT_RGB);
  doc.rect(0, 0, PAGE_WIDTH, 3, "F");

  doc.setTextColor(...INK_RGB);
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text(grid.name, MARGIN_X, y);

  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.setTextColor(...MUTED_RGB);
  doc.text(`${student.last_name} ${student.first_name}`, MARGIN_X, y + 7);

  doc.setTextColor(...ACCENT_RGB);
  doc.setFontSize(28);
  doc.setFont(undefined, "bold");
  doc.text(`${formatGrade(overall.grade20)} / 20`, PAGE_WIDTH - MARGIN_X, y + 4, { align: "right" });

  y += 14;
  doc.setDrawColor(...BORDER_RGB);
  doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
  y += 8;

  grid.categories.forEach((cat) => {
    const catCriteria = grid.criteria.filter((c) => c.category_id === cat.id);
    if (catCriteria.length === 0) return;
    const catGrade = categoryGrades.find((g) => g.categoryId === cat.id);

    newPageIfNeeded(20);

    doc.setFillColor(...ACCENT_RGB);
    doc.rect(MARGIN_X, y - 4, 1.4, 5.5, "F");
    doc.setTextColor(...INK_RGB);
    doc.setFontSize(12.5);
    doc.setFont(undefined, "bold");
    doc.text(cat.name, MARGIN_X + 4, y);
    doc.setTextColor(...ACCENT_RGB);
    doc.text(`${formatPoints(catGrade?.earnedPoints)} / ${catGrade?.totalWeight ?? 0}`, PAGE_WIDTH - MARGIN_X, y, { align: "right" });
    y += 3;
    if (cat.deliverable) {
      y += 4.5;
      doc.setFontSize(9.5);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...MUTED_RGB);
      doc.text(`Livrable : ${cat.deliverable}`, MARGIN_X + 4, y);
      y += 1.5;
    }

    const rows = catCriteria.map((c) => {
      const entry = getMark(c.id);
      const label = entry ? levelLabelFor(grid, entry.levelPosition) : "Non évalué";
      const points = entry ? criterionPoints(c, entry.levelPosition, grid.levels) : null;
      return { criterion: c, entry, label, pointsText: `${formatPoints(points)} / ${c.weight}` };
    });

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_X, right: MARGIN_X },
      head: [["Critère", "Niveau", "Points", "Appréciation"]],
      body: rows.map((r) => [r.criterion.name, r.label, r.pointsText, r.entry?.comment || ""]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2.6, textColor: INK_RGB, lineColor: BORDER_RGB, lineWidth: 0.2 },
      headStyles: { fillColor: ACCENT_RGB, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
      alternateRowStyles: { fillColor: [247, 248, 251] },
      columnStyles: {
        0: { cellWidth: 62, fontStyle: "bold" },
        1: { cellWidth: 52 },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: "auto", textColor: MUTED_RGB },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          data.cell.styles.cellPadding = { top: 2.6, right: 2.6, bottom: 2.6, left: 9 };
        }
      },
      didDrawCell: (data) => {
        if (data.section !== "body" || data.column.index !== 1) return;
        const pos = rows[data.row.index]?.entry?.levelPosition;
        if (pos === null || pos === undefined) return;
        doc.setFillColor(...hexToRgb(LEVEL_COLORS[pos]));
        doc.circle(data.cell.x + 4.2, data.cell.y + data.cell.height / 2, 1.8, "F");
      },
    });

    y = doc.lastAutoTable.finalY + 10;
  });

  if (student.comment) {
    newPageIfNeeded(20);
    doc.setFontSize(11.5);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...INK_RGB);
    doc.text("Appréciation générale", MARGIN_X, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.setTextColor(...MUTED_RGB);
    const lines = doc.splitTextToSize(student.comment, CONTENT_WIDTH);
    doc.text(lines, MARGIN_X, y);
  }

  return doc;
}

/** Télécharge le PDF d'un seul élève. */
export function exportStudentPdf(grid, student, getMark) {
  buildStudentPdf(grid, student, getMark).save(fileNameFor(grid, student));
}

/**
 * Construit le PDF (jsPDF, paysage) de la grille « vierge » : même mise en page que
 * `buildStudentPdf` (bandeau, tableau Critère / Niveau / Points / Appréciation par
 * catégorie) mais sans évaluation ni élève - juste une ligne « Nom » à remplir à la main
 * (pas de prénom, pas de note, pas d'appréciation générale). Accepte aussi bien une grille
 * déjà enregistrée que l'état en cours de saisie d'un `GridForm` (même forme : `{ name,
 * levels, categories: [{id, name}], criteria: [{name, weight, category_id}] }`), donc
 * utilisable dès la création, avant tout enregistrement.
 */
export function buildBlankGridPdf(grid) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let y = 20;

  const newPageIfNeeded = (needed) => {
    if (y + needed > PAGE_HEIGHT - 15) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFillColor(...ACCENT_RGB);
  doc.rect(0, 0, PAGE_WIDTH, 3, "F");

  doc.setTextColor(...INK_RGB);
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text(grid.name || "Grille vierge", MARGIN_X, y);

  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.setTextColor(...MUTED_RGB);
  doc.text("Nom : ________________________________", MARGIN_X, y + 7);

  y += 14;
  doc.setDrawColor(...BORDER_RGB);
  doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
  y += 8;

  grid.categories.forEach((cat) => {
    const catCriteria = grid.criteria.filter((c) => (c.category_id ?? c.categoryId) === cat.id);
    if (catCriteria.length === 0) return;
    const totalWeight = catCriteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);

    newPageIfNeeded(20);

    doc.setFillColor(...ACCENT_RGB);
    doc.rect(MARGIN_X, y - 4, 1.4, 5.5, "F");
    doc.setTextColor(...INK_RGB);
    doc.setFontSize(12.5);
    doc.setFont(undefined, "bold");
    doc.text(cat.name, MARGIN_X + 4, y);
    doc.setTextColor(...MUTED_RGB);
    doc.setFont(undefined, "normal");
    doc.text(`${totalWeight} pt${totalWeight > 1 ? "s" : ""} au total`, PAGE_WIDTH - MARGIN_X, y, { align: "right" });
    y += 3;
    if (cat.deliverable) {
      y += 4.5;
      doc.setFontSize(9.5);
      doc.text(`Livrable : ${cat.deliverable}`, MARGIN_X + 4, y);
      y += 1.5;
    }

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_X, right: MARGIN_X },
      head: [["Critère", "Niveau", "Points", "Appréciation"]],
      body: catCriteria.map((c) => [c.name, "", "", ""]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2.6, minCellHeight: 9, textColor: INK_RGB, lineColor: BORDER_RGB, lineWidth: 0.2 },
      headStyles: { fillColor: ACCENT_RGB, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
      alternateRowStyles: { fillColor: [247, 248, 251] },
      columnStyles: {
        0: { cellWidth: 62, fontStyle: "bold" },
        1: { cellWidth: 52 },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: "auto", textColor: MUTED_RGB },
      },
    });

    y = doc.lastAutoTable.finalY + 10;
  });

  return doc;
}

/** Télécharge le PDF de la grille vierge (structure seule, sans évaluation). */
export function exportBlankGridPdf(grid) {
  buildBlankGridPdf(grid).save(sanitizeFileName(grid.name || "grille") + "_vierge.pdf");
}

/** Génère un PDF par élève et les regroupe dans une archive .zip téléchargée. */
export async function exportAllStudentsZip(grid, students, getMarkFor) {
  const zip = new JSZip();
  students.forEach((student) => {
    const doc = buildStudentPdf(grid, student, (criterionId) => getMarkFor(student.id, criterionId));
    zip.file(fileNameFor(grid, student), doc.output("blob"));
  });
  const content = await zip.generateAsync({ type: "blob" });
  const zipName = sanitizeFileName(grid.name) + "_evaluations.zip";
  triggerBlobDownload(content, zipName);
}
