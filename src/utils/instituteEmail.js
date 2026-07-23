export const INSTITUTE_DOMAIN = "diu.iiitvadodara.ac.in";
export const TEST_BATCH_FIRST_ROLL = 202411001;
export const TEST_BATCH_LAST_ROLL = 202411102;

const INSTITUTE_EMAIL_PATTERN =
  /^(\d{9})@diu\.iiitvadodara\.ac\.in$/i;

export function parseInstituteEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  const match = email.match(INSTITUTE_EMAIL_PATTERN);

  if (!match) {
    return {
      allowed: false,
      email,
      rollNumber: null,
      reason:
        "Please continue with your institute Google account.",
    };
  }

  const rollNumber = Number(match[1]);

  if (
    !Number.isInteger(rollNumber) ||
    rollNumber < TEST_BATCH_FIRST_ROLL ||
    rollNumber > TEST_BATCH_LAST_ROLL
  ) {
    return {
      allowed: false,
      email,
      rollNumber: match[1],
      reason:
        `Only roll numbers ${TEST_BATCH_FIRST_ROLL} to ${TEST_BATCH_LAST_ROLL} are enabled during testing.`,
    };
  }

  return {
    allowed: true,
    email,
    rollNumber: match[1],
    reason: "",
  };
}

export function isAllowedInstituteEmail(value) {
  return parseInstituteEmail(value).allowed;
}
