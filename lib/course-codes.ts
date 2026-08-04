const COURSE_CODE_PATTERN = /^[A-Z]{2,10}\d{3}[A-Z]?$/;

export function parseCourseCodes(value: string) {
  const courses = value
    .split(",")
    .map((course) => course.trim().replace(/\s+/g, "").toUpperCase())
    .filter(Boolean);

  if (!courses.length) {
    return { courses: [], error: "Add at least one course code, for example DES100." };
  }

  const invalid = courses.find((course) => !COURSE_CODE_PATTERN.test(course));
  if (invalid) {
    return {
      courses: [],
      error: `“${invalid}” is not in the right format. Try DES100 or COMPSCI130, separated by commas.`,
    };
  }

  return { courses: Array.from(new Set(courses)).slice(0, 12), error: "" };
}
