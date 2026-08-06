function formatSports(sports) {
  if (!Array.isArray(sports) || sports.length === 0) {
    return "";
  }

  return sports
    .map((sport) => {
      const details = [sport.name || "Sport"];

      if (sport.position) {
        details.push(`Position: ${sport.position}`);
      }

      if (sport.skill_level) {
        details.push(`Level: ${sport.skill_level}`);
      }

      return details.join(" - ");
    })
    .join("; ");
}

export async function downloadRegisteredPlayersWorkbook({
  registrations,
}) {
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Olympus";
  workbook.title = "Olympus Registered Players";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Registered Players", {
    views: [
      {
        state: "frozen",
        ySplit: 1,
        showGridLines: false,
      },
    ],
  });

  worksheet.columns = [
    { header: "Sr. No.", key: "serial", width: 10 },
    { header: "Full Name", key: "fullName", width: 28 },
    { header: "Roll Number", key: "rollNumber", width: 17 },
    { header: "Email", key: "email", width: 34 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Gender", key: "gender", width: 12 },
    { header: "Branch", key: "branch", width: 36 },
    { header: "Year", key: "year", width: 14 },
    { header: "Selected Sports", key: "sports", width: 65 },
    { header: "Registered At", key: "registeredAt", width: 22 },
  ];

  worksheet.getRow(1).font = {
    bold: true,
  };

  worksheet.getRow(1).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.getRow(1).height = 26;

  registrations.forEach((registration, index) => {
    const row = worksheet.addRow({
      serial: index + 1,
      fullName: registration.full_name || "",
      rollNumber: registration.roll_number || "",
      email: registration.email || "",
      phone: registration.phone || "",
      gender: registration.gender || "",
      branch: registration.branch || "",
      year: registration.year || "",
      sports: formatSports(registration.sports),
      registeredAt: registration.created_at
        ? new Date(registration.created_at)
        : "",
    });

    row.getCell("registeredAt").numFmt = "dd-mmm-yyyy hh:mm";

    row.alignment = {
      vertical: "middle",
      wrapText: true,
    };

    row.height = 32;
  });

  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download =
    `olympus-registered-players-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(downloadUrl);
}
