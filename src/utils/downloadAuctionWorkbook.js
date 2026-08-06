const MIN_MEMBER_ROWS = 12;

const thinBorder = {
  top: { style: "thin", color: { argb: "FF555555" } },
  left: { style: "thin", color: { argb: "FF555555" } },
  bottom: { style: "thin", color: { argb: "FF555555" } },
  right: { style: "thin", color: { argb: "FF555555" } },
};

function applyCellStyle(cell, options = {}) {
  const {
    bold = false,
    horizontal = "center",
    fontSize = 10,
  } = options;

  cell.font = {
    bold,
    size: fontSize,
    color: { argb: "FF111111" },
  };

  cell.alignment = {
    horizontal,
    vertical: "middle",
    wrapText: true,
  };

  cell.border = thinBorder;
}

function getFranchiseMembers(franchise) {
  const members = [];

  if (franchise.leader) {
    members.push({
      name: franchise.leader.name || "Franchise Leader",
      amount: "-",
      isLeader: true,
    });
  }

  franchise.roster.forEach((player) => {
    members.push({
      name:
        player.registration?.full_name ||
        "Registered Player",
      amount:
        player.sold_price == null
          ? "-"
          : Number(player.sold_price),
      isLeader: false,
    });
  });

  return members;
}

function buildFranchiseTable({
  worksheet,
  franchise,
  startColumn,
  startRow,
  memberRows,
}) {
  const serialColumn = startColumn;
  const memberColumn = startColumn + 1;
  const amountColumn = startColumn + 2;

  worksheet.getColumn(serialColumn).width = 9;
  worksheet.getColumn(memberColumn).width = 25;
  worksheet.getColumn(amountColumn).width = 12;

  /*
   * Franchise name row
   */
  worksheet.mergeCells(
    startRow,
    serialColumn,
    startRow,
    amountColumn
  );

  const franchiseNameCell = worksheet.getCell(
    startRow,
    serialColumn
  );

  franchiseNameCell.value = String(
    franchise.name || ""
  ).toUpperCase();

  applyCellStyle(franchiseNameCell, {
    bold: true,
    horizontal: "center",
    fontSize: 11,
  });

  /*
   * Apply borders across the complete merged header.
   */
  for (
    let column = serialColumn;
    column <= amountColumn;
    column += 1
  ) {
    worksheet.getCell(startRow, column).border =
      thinBorder;
  }

  worksheet.getRow(startRow).height = 24;

  /*
   * Column headings
   */
  const headerRow = startRow + 1;

  const headings = [
    [serialColumn, "Sr. No."],
    [memberColumn, "Members"],
    [amountColumn, "Amount"],
  ];

  headings.forEach(([column, title]) => {
    const cell = worksheet.getCell(
      headerRow,
      column
    );

    cell.value = title;

    applyCellStyle(cell, {
      bold: true,
      horizontal: "center",
      fontSize: 10,
    });
  });

  worksheet.getRow(headerRow).height = 22;

  /*
   * Leader and purchased players
   */
  const members = getFranchiseMembers(franchise);

  for (
    let index = 0;
    index < memberRows;
    index += 1
  ) {
    const rowNumber = headerRow + index + 1;
    const member = members[index] || null;

    const serialCell = worksheet.getCell(
      rowNumber,
      serialColumn
    );

    const memberCell = worksheet.getCell(
      rowNumber,
      memberColumn
    );

    const amountCell = worksheet.getCell(
      rowNumber,
      amountColumn
    );

    serialCell.value = member ? index + 1 : "";
    memberCell.value = member?.name || "";

    if (!member) {
      amountCell.value = "";
    } else if (member.amount === "-") {
      amountCell.value = "-";
    } else {
      amountCell.value = member.amount;
      amountCell.numFmt = "#,##0";
    }

    applyCellStyle(serialCell, {
      horizontal: "center",
    });

    applyCellStyle(memberCell, {
      bold: Boolean(member?.isLeader),
      horizontal: "center",
    });

    applyCellStyle(amountCell, {
      horizontal: "center",
    });

    worksheet.getRow(rowNumber).height = 21;
  }

  return headerRow + memberRows;
}

function buildFranchiseSection({
  worksheet,
  franchises,
  startRow,
}) {
  const memberRows = Math.max(
    MIN_MEMBER_ROWS,
    ...franchises.map(
      (franchise) =>
        franchise.roster.length +
        (franchise.leader ? 1 : 0)
    )
  );

  let sectionEndRow = startRow;

  franchises.forEach(
    (franchise, franchiseIndex) => {
      const endRow = buildFranchiseTable({
        worksheet,
        franchise,
        startColumn: franchiseIndex * 3 + 1,
        startRow,
        memberRows,
      });

      sectionEndRow = Math.max(
        sectionEndRow,
        endRow
      );
    }
  );

  return sectionEndRow;
}

function buildUnsoldPlayersTable({
  worksheet,
  unsoldPlayers,
  startRow,
}) {
  worksheet.mergeCells(startRow, 1, startRow, 3);

  const titleCell = worksheet.getCell(startRow, 1);
  titleCell.value = "UNSOLD PLAYERS";

  applyCellStyle(titleCell, {
    bold: true,
    horizontal: "center",
    fontSize: 11,
  });

  for (let column = 1; column <= 3; column += 1) {
    worksheet.getCell(startRow, column).border = thinBorder;
  }

  const headerRow = startRow + 1;

  const headings = [
    [1, "Sr. No."],
    [2, "Members"],
    [3, "Amount"],
  ];

  headings.forEach(([column, title]) => {
    const cell = worksheet.getCell(headerRow, column);
    cell.value = title;

    applyCellStyle(cell, {
      bold: true,
      horizontal: "center",
      fontSize: 10,
    });
  });

  unsoldPlayers.forEach((player, index) => {
    const rowNumber = headerRow + index + 1;

    const serialCell = worksheet.getCell(rowNumber, 1);
    const memberCell = worksheet.getCell(rowNumber, 2);
    const amountCell = worksheet.getCell(rowNumber, 3);

    serialCell.value = index + 1;
    memberCell.value =
      player.registration?.full_name || "Registered Player";
    amountCell.value = "-";

    applyCellStyle(serialCell, {
      horizontal: "center",
    });

    applyCellStyle(memberCell, {
      horizontal: "center",
    });

    applyCellStyle(amountCell, {
      horizontal: "center",
    });

    worksheet.getRow(rowNumber).height = 21;
  });

  return headerRow + unsoldPlayers.length;
}

export async function downloadAuctionWorkbook({
  summary,
  unsoldPlayers = [],
}) {
  const ExcelJSModule = await import("exceljs");
  const ExcelJS =
    ExcelJSModule.default || ExcelJSModule;

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Olympus";
  workbook.title = "Olympus Auction Summary";
  workbook.subject = "Franchise Auction Results";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(
    "Auction Summary",
    {
      views: [
        {
          showGridLines: false,
        },
      ],
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    }
  );

  const firstFourFranchises = summary.slice(0, 4);
  const remainingFranchises = summary.slice(4, 8);

  /*
   * First row of four franchise tables.
   */
  const firstSectionEnd = buildFranchiseSection({
    worksheet,
    franchises: firstFourFranchises,
    startRow: 1,
  });

  /*
   * One empty row, then the remaining four tables.
   */
  const secondSectionStart = firstSectionEnd + 2;

  const secondSectionEnd = buildFranchiseSection({
    worksheet,
    franchises: remainingFranchises,
    startRow: secondSectionStart,
  });

  let finalRow = secondSectionEnd;

  if (unsoldPlayers.length > 0) {
    finalRow = buildUnsoldPlayersTable({
      worksheet,
      unsoldPlayers,
      startRow: secondSectionEnd + 2,
    });
  }

  worksheet.pageSetup.printArea = `A1:L${finalRow}`;

  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const downloadUrl =
    URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download =
    `olympus-auction-summary-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(downloadUrl);
}
