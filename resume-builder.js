const SUPABASE_URL = "https://nbyougepbwqewjqnrqxq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ieW91Z2VwYndxZXdqcW5ycXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MDMyNDMsImV4cCI6MjEwMTA3OTI0M30.OVE8bNdNfIMlkJZ4ATJgB7xQz8diWtg93Bar3PxLqSY";
 
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 
// ---- DOM references ----
const authScreen = document.getElementById("rb-auth-screen");
const appScreen = document.getElementById("rb-app-screen");
const userInfo = document.getElementById("rb-user-info");
const userEmailEl = document.getElementById("rb-user-email");
 
const emailInput = document.getElementById("rb-email-input");
const sendLinkBtn = document.getElementById("rb-send-link-btn");
const authStatus = document.getElementById("rb-auth-status");
 
const saveBtn = document.getElementById("rb-save-btn");
const pdfBtn = document.getElementById("rb-pdf-btn");
const signOutBtn = document.getElementById("rb-signout-btn");
const saveStatus = document.getElementById("rb-save-status");
 
const fields = [
  "name", "role", "email", "phone", "location", "linkedin", "github", "portfolio",
  "keywords", "summary", "experience", "projects", "education",
  "skills-programming", "skills-tools", "skills-core",
  "achievements", "certifications"
];
 
let currentUser = null;
 
// ---- Auth: send magic link ----
sendLinkBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) {
    authStatus.textContent = "Please enter your email.";
    return;
  }
  authStatus.textContent = "Sending link...";
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href }
  });
  if (error) {
    authStatus.textContent = "Error: " + error.message;
  } else {
    authStatus.textContent = "Check your email for the sign-in link!";
  }
});
 
// ---- Auth: sign out ----
signOutBtn.addEventListener("click", async () => {
  await sb.auth.signOut();
  window.location.reload();
});
 
// ---- Auth: watch login state ----
sb.auth.onAuthStateChange((event, session) => {
  if (session && session.user) {
    currentUser = session.user;
    showApp(currentUser);
  } else {
    showAuth();
  }
});
 
sb.auth.getSession().then(({ data }) => {
  if (data.session && data.session.user) {
    currentUser = data.session.user;
    showApp(currentUser);
  }
});
 
function showApp(user) {
  authScreen.style.display = "none";
  appScreen.style.display = "flex";
  userInfo.style.display = "flex";
  userEmailEl.textContent = user.email;
  loadResume();
}
 
function showAuth() {
  authScreen.style.display = "flex";
  appScreen.style.display = "none";
  userInfo.style.display = "none";
}
 
// ---- Load existing resume ----
async function loadResume() {
  const { data, error } = await sb
    .from("resumes")
    .select("data")
    .eq("user_id", currentUser.id)
    .maybeSingle();
 
  if (error) {
    console.error(error);
    return;
  }
  if (data && data.data) {
    fields.forEach((f) => {
      const el = document.getElementById("f-" + f);
      if (el && data.data[f]) el.value = data.data[f];
    });
    updatePreview();
  }
}
 
// ---- Save resume ----
saveBtn.addEventListener("click", async () => {
  const payload = {};
  fields.forEach((f) => {
    payload[f] = document.getElementById("f-" + f).value;
  });
 
  saveStatus.textContent = "Saving...";
  const { error } = await sb.from("resumes").upsert(
    {
      user_id: currentUser.id,
      data: payload,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
 
  if (error) {
    saveStatus.textContent = "Error saving: " + error.message;
    console.error(error);
  } else {
    saveStatus.textContent = "Saved!";
    setTimeout(() => (saveStatus.textContent = ""), 2000);
  }
});
 
// ---- Live preview ----
fields.forEach((f) => {
  const el = document.getElementById("f-" + f);
  if (el) el.addEventListener("input", updatePreview);
});
 
function updatePreview() {
  const val = (id) => document.getElementById("f-" + id).value.trim();
 
  document.getElementById("p-name").textContent = val("name") || "YOUR FULL NAME";
  document.getElementById("p-role").textContent = val("role") || "TARGET ROLE / JOB TITLE";
 
  const contactParts = [val("email"), val("phone"), val("location")].filter(Boolean);
  document.getElementById("p-contact").textContent = contactParts.join("  •  ");
 
  const linkParts = [];
  if (val("linkedin")) linkParts.push(val("linkedin"));
  if (val("github")) linkParts.push(val("github"));
  if (val("portfolio")) linkParts.push(val("portfolio"));
  const contactEl = document.getElementById("p-contact");
  if (linkParts.length) {
    contactEl.textContent = [contactEl.textContent, linkParts.join("  •  ")].filter(Boolean).join("  •  ");
  }
 
  document.getElementById("p-keywords").textContent = val("keywords")
    .split(",").map(s => s.trim()).filter(Boolean).join("   •   ");
 
  document.getElementById("p-summary").textContent = val("summary");
  document.getElementById("p-experience").textContent = val("experience");
  document.getElementById("p-projects").textContent = val("projects");
  document.getElementById("p-education").textContent = val("education");
 
  const skillLines = [];
  if (val("skills-programming")) skillLines.push("Programming: " + val("skills-programming"));
  if (val("skills-tools")) skillLines.push("Tools & Platforms: " + val("skills-tools"));
  if (val("skills-core")) skillLines.push("Core Competencies: " + val("skills-core"));
  document.getElementById("p-skills").textContent = skillLines.join("\n");
 
  document.getElementById("p-achievements").textContent = val("achievements");
  document.getElementById("p-certifications").textContent = val("certifications");
}
 
// ---- Download as PDF ----
pdfBtn.addEventListener("click", () => {
  const preview = document.getElementById("rb-preview");
  const name = document.getElementById("f-name").value || "resume";
 
  // sticky positioning breaks html2canvas capture — temporarily disable it
  preview.style.position = "static";
  preview.style.top = "auto";
 
  html2pdf().from(preview).set({
    margin: 0.4,
    filename: name.replace(/\s+/g, "_") + "_resume.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
  }).save().then(() => {
    preview.style.position = "";
    preview.style.top = "";
  });
});
