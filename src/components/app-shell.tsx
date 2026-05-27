"use client";

import {
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  FolderOpen,
  Loader2,
  ShieldCheck,
  Sparkles,
  Upload
} from "lucide-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { getAiFieldExplanation } from "@/lib/ai";
import {
  getRetirementChecklist,
  getRetirementCostEstimate,
  getRetirementRoute,
  type RetirementChecklist,
  type RetirementCostEstimate,
  type RetirementRouteResult
} from "@/lib/retirement";
import { getTm7DocumentChecklist, getTm7Readiness, type Tm7DocumentChecklist } from "@/lib/tm7";
import type { AppData, ClientProfile, DocumentRecord, FormPacket, RetirementWorkflowData, Tm7WorkflowData } from "@/lib/types";

interface AppShellProps {
  initialData: AppData;
}

type ActiveConsole = "tm7" | "retirement" | "profile" | "documents";

const now = () => new Date().toISOString();

const defaultStayUntil = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
};

const formatThb = (value: number) => `${value.toLocaleString("en-US")} THB`;

const navButtonClass = (isActive: boolean) =>
  `flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors ${
    isActive ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-muted hover:text-ink"
  }`;

const blankProfile = (): ClientProfile => ({
  id: "draft",
  legalFirstName: "",
  legalFamilyName: "",
  nationality: "",
  dateOfBirth: "",
  placeOfBirth: "",
  passportNumber: "",
  passportIssueDate: "",
  passportIssuedAt: "",
  passportExpiryDate: "",
  visaType: "",
  arrivalDate: "",
  arrivedBy: "",
  arrivalFrom: "",
  portOfArrival: "",
  tm6Number: "",
  thaiAddressNumber: "",
  thaiAddressLine: "",
  road: "",
  subDistrict: "",
  district: "",
  province: "",
  postCode: "",
  phone: "",
  createdAt: now(),
  updatedAt: now()
});

const profileFields: Array<{
  label: string;
  key: keyof ClientProfile;
  type?: string;
  placeholder?: string;
}> = [
  { label: "First name", key: "legalFirstName", placeholder: "Alex" },
  { label: "Middle name", key: "legalMiddleName", placeholder: "Optional middle name" },
  { label: "Family name", key: "legalFamilyName", placeholder: "Morgan" },
  { label: "Nationality", key: "nationality", placeholder: "Canadian" },
  { label: "Date of birth", key: "dateOfBirth", type: "date" },
  { label: "Place of birth", key: "placeOfBirth", placeholder: "Toronto" },
  { label: "Passport number", key: "passportNumber", placeholder: "AB123456" },
  { label: "Passport issue date", key: "passportIssueDate", type: "date" },
  { label: "Passport issued at", key: "passportIssuedAt", placeholder: "Ottawa" },
  { label: "Passport expiry date", key: "passportExpiryDate", type: "date" },
  { label: "Type of visa", key: "visaType", placeholder: "Non-Immigrant O" },
  { label: "Arrival date", key: "arrivalDate", type: "date" },
  { label: "Arrived by", key: "arrivedBy", placeholder: "Air" },
  { label: "Arrived from", key: "arrivalFrom", placeholder: "Singapore" },
  { label: "Port of arrival", key: "portOfArrival", placeholder: "Suvarnabhumi Airport" },
  { label: "Arrival/departure card no. (TM.6)", key: "tm6Number", placeholder: "Optional where applicable" },
  { label: "Address number", key: "thaiAddressNumber", placeholder: "88/12" },
  { label: "Road", key: "road", placeholder: "Lagoon Road" },
  { label: "Subdistrict", key: "subDistrict", placeholder: "Choeng Thale" },
  { label: "District", key: "district", placeholder: "Thalang" },
  { label: "Province", key: "province", placeholder: "Phuket" },
  { label: "Post code", key: "postCode", placeholder: "83110" },
  { label: "Thailand address note", key: "thaiAddressLine", placeholder: "Building, floor, or extra address detail" },
  { label: "Phone", key: "phone", placeholder: "+66 81 000 0000" }
];

export function AppShell({ initialData }: AppShellProps) {
  const [activeConsole, setActiveConsole] = useState<ActiveConsole>("tm7");
  const [profile, setProfile] = useState<ClientProfile>(initialData.profiles[0] ?? blankProfile());
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialData.documents);
  const [packet, setPacket] = useState<FormPacket | null>(initialData.packets[0] ?? null);
  const [workflow, setWorkflow] = useState<Tm7WorkflowData>(
    initialData.packets[0]?.workflowData ?? {
      writtenAt: "",
      applicationDate: "",
      extensionReason: "",
      requestedExtensionDays: 365,
      documentChecklistConfirmedIds: []
    }
  );
  const [documentType, setDocumentType] = useState("passport");
  const [retirementWorkflow, setRetirementWorkflow] = useState<RetirementWorkflowData>({
    age: 50,
    currentStatus: "tourist_visa",
    currentStayUntil: defaultStayUntil(),
    hasOverstay: false,
    hasThaiBankAccount: true,
    financialMethod: "bank_deposit",
    reEntryPreference: "multiple",
    immigrationOfficeProvince: profile.province || "Phuket",
    checklistConfirmedIds: []
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("Ready to build a TM.7 packet.");

  const readiness = useMemo(() => getTm7Readiness(profile, workflow), [profile, workflow]);
  const checklist = useMemo(
    () => getTm7DocumentChecklist(workflow.documentChecklistConfirmedIds),
    [workflow.documentChecklistConfirmedIds]
  );
  const retirementRoute = useMemo(() => getRetirementRoute(retirementWorkflow), [retirementWorkflow]);
  const retirementCost = useMemo(
    () =>
      getRetirementCostEstimate({
        route: retirementRoute.outcome,
        reEntryPreference: retirementWorkflow.reEntryPreference
      }),
    [retirementRoute.outcome, retirementWorkflow.reEntryPreference]
  );
  const retirementChecklist = useMemo(
    () =>
      getRetirementChecklist({
        outcome: retirementRoute.outcome,
        reEntryPreference: retirementWorkflow.reEntryPreference,
        confirmedIds: retirementWorkflow.checklistConfirmedIds
      }),
    [retirementRoute.outcome, retirementWorkflow.reEntryPreference, retirementWorkflow.checklistConfirmedIds]
  );
  const latestPacketReady = packet?.status === "ready_for_review" || packet?.status === "approved";

  async function saveProfile() {
    setBusy("profile");
    setMessage("Saving profile...");
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    const saved = (await response.json()) as ClientProfile;
    setProfile(saved);

    const savedReadiness = getTm7Readiness(saved, workflow);
    if (packet && savedReadiness.status === "ready_for_review") {
      setMessage("Profile saved. Updating TM.7 preview...");
      const previewResponse = await fetch("/api/packets/tm7", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientProfileId: saved.id, workflowData: workflow })
      });
      const result = (await previewResponse.json()) as { packet: FormPacket; error?: string };
      if (!previewResponse.ok) {
        setMessage(result.error ?? "Profile saved. Could not update the TM.7 preview.");
        setBusy(null);
        return;
      }
      setPacket(result.packet);
      setMessage("Profile saved and TM.7 preview updated.");
      setBusy(null);
      return;
    }

    setMessage("Profile saved.");
    setBusy(null);
  }

  async function generatePreview() {
    setBusy("packet");
    setMessage("Generating TM.7 preview...");
    const savedProfile = profile.id === "draft" ? await saveDraftProfile() : profile;
    const response = await fetch("/api/packets/tm7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientProfileId: savedProfile.id, workflowData: workflow })
    });
    const result = (await response.json()) as { packet: FormPacket; missing?: unknown[]; error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Could not generate the packet.");
      setBusy(null);
      return;
    }
    setPacket(result.packet);
    setMessage(result.packet.status === "ready_for_review" ? "Ready for review" : "Missing information remains");
    setBusy(null);
  }

  async function saveDraftProfile() {
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    const saved = (await response.json()) as ClientProfile;
    setProfile(saved);
    return saved;
  }

  async function approvePacket() {
    if (!packet) return;
    setBusy("approve");
    const response = await fetch(`/api/packets/${packet.id}/approve`, { method: "POST" });
    const approved = (await response.json()) as FormPacket;
    setPacket(approved);
    setMessage("Approved");
    setBusy(null);
  }

  async function uploadDocument(formData: FormData) {
    setBusy("upload");
    setMessage("Uploading document...");
    const savedProfile = profile.id === "draft" ? await saveDraftProfile() : profile;
    formData.set("clientProfileId", savedProfile.id);
    formData.set("type", documentType);

    const response = await fetch("/api/documents", {
      method: "POST",
      body: formData
    });
    const document = (await response.json()) as DocumentRecord;
    setDocuments((current) => [document, ...current]);
    setMessage("Document stored in local vault.");
    setBusy(null);
  }

  function toggleChecklistItem(id: string, checked: boolean) {
    setWorkflow((current) => {
      const confirmed = new Set(current.documentChecklistConfirmedIds ?? []);
      if (checked) {
        confirmed.add(id);
      } else {
        confirmed.delete(id);
      }

      return {
        ...current,
        documentChecklistConfirmedIds: Array.from(confirmed)
      };
    });
  }

  function toggleRetirementChecklistItem(id: string, checked: boolean) {
    setRetirementWorkflow((current) => {
      const confirmed = new Set(current.checklistConfirmedIds ?? []);
      if (checked) {
        confirmed.add(id);
      } else {
        confirmed.delete(id);
      }

      return {
        ...current,
        checklistConfirmedIds: Array.from(confirmed)
      };
    });
  }

  async function extractDocument(document: DocumentRecord) {
    setBusy(document.id);
    setMessage("Running AI extraction for review...");
    const response = await fetch(`/api/documents/${document.id}/extract`, { method: "POST" });
    const updated = (await response.json()) as DocumentRecord | { error: string };
    if (!response.ok || "error" in updated) {
      setMessage("AI extraction is unavailable. Check OPENAI_API_KEY and try again.");
      setBusy(null);
      return;
    }
    setDocuments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setMessage("AI suggestions are ready for review.");
    setBusy(null);
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-md border border-line bg-surface p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-normal">VisaFiler AI</h1>
              <p className="text-sm text-muted">Thailand visa paperwork desk</p>
            </div>
          </div>
          <nav className="mt-8 space-y-2 text-sm font-semibold" aria-label="Workspace">
            <button className={navButtonClass(activeConsole === "tm7")} onClick={() => setActiveConsole("tm7")}>
              <FileCheck2 className="h-4 w-4" aria-hidden />
              TM.7 packet workflow
            </button>
            <button
              className={navButtonClass(activeConsole === "retirement")}
              onClick={() => setActiveConsole("retirement")}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Retirement visa
            </button>
            <button
              className={navButtonClass(activeConsole === "profile")}
              onClick={() => setActiveConsole("profile")}
            >
              <FileText className="h-4 w-4" aria-hidden />
              Profile vault
            </button>
            <button
              className={navButtonClass(activeConsole === "documents")}
              onClick={() => setActiveConsole("documents")}
            >
              <FolderOpen className="h-4 w-4" aria-hidden />
              Document vault
            </button>
          </nav>
          <div className="mt-8 rounded-md border border-line bg-background p-3 text-sm text-muted">
            <p className="font-semibold text-ink">Local pilot</p>
            <p>Data and generated PDFs stay in the ignored local vault.</p>
          </div>
        </aside>

        <section className="space-y-6">
          {activeConsole === "tm7" ? (
            <>
              <div className="rounded-md border border-line bg-surface p-5 shadow-soft">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <p className="text-sm font-semibold text-primary">Individual TM.7 MVP</p>
                    <h2 className="mt-1 text-3xl font-bold tracking-normal">Create, review, and export a TM.7 packet</h2>
                    <p className="mt-2 max-w-2xl text-sm text-muted">
                      TM.7 is the Thai immigration form for extending a temporary stay, including a{" "}
                      <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 font-semibold text-accent">
                        30-day visa extension
                      </span>
                      .
                    </p>
                  </div>
                  <div className="rounded-md border border-line bg-background px-4 py-3 text-sm">
                    <p className="font-semibold text-ink">{message}</p>
                    <p className="text-muted">{readiness.missingCount} missing fields before export readiness</p>
                  </div>
                </div>
              </div>

              <section id="workflow" className="space-y-6">
                <div className="rounded-md border border-line bg-surface p-5 shadow-soft">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">TM.7 packet workflow</h3>
                      <p className="text-sm text-muted">One-time answers for this application.</p>
                    </div>
                    <StatusBadge status={packet?.status ?? readiness.status} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field
                      label="Written at"
                      value={workflow.writtenAt ?? ""}
                      onChange={(value) => setWorkflow((current) => ({ ...current, writtenAt: value }))}
                    />
                    <Field
                      label="Application date"
                      type="date"
                      value={workflow.applicationDate ?? ""}
                      onChange={(value) => setWorkflow((current) => ({ ...current, applicationDate: value }))}
                    />
                    <Field
                      label="Reason for extension"
                      value={workflow.extensionReason ?? ""}
                      onChange={(value) => setWorkflow((current) => ({ ...current, extensionReason: value }))}
                    />
                    <Field
                      label="Requested extension days"
                      type="number"
                      value={String(workflow.requestedExtensionDays ?? "")}
                      onChange={(value) =>
                        setWorkflow((current) => ({ ...current, requestedExtensionDays: Number(value) }))
                      }
                    />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover"
                      onClick={generatePreview}
                      disabled={busy !== null}
                    >
                      {busy === "packet" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileCheck2 className="h-4 w-4" />
                      )}
                      Generate preview
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-semibold text-ink disabled:text-muted"
                      onClick={approvePacket}
                      disabled={!packet || packet.status !== "ready_for_review" || busy !== null}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve packet
                    </button>
                    {packet?.status === "approved" ? (
                      <a
                        className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary-soft px-4 py-2 font-semibold text-primary"
                        href={`/api/packets/${packet.id}/download`}
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </a>
                    ) : null}
                  </div>
                  <ChecklistPanel checklist={checklist} onToggle={toggleChecklistItem} />
                </div>

                <div className="rounded-md border border-line bg-surface p-5 shadow-soft">
                  <h3 className="text-lg font-bold">Missing information</h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {readiness.missing.length === 0 ? (
                      <div className="rounded-md bg-primary-soft p-3 text-sm text-primary">Ready for review</div>
                    ) : (
                      readiness.missing.map((field) => (
                        <div className="rounded-md border border-line p-3" key={field.key}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold">{field.label}</p>
                            <span className="rounded-full bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
                              {field.source}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-muted">{getAiFieldExplanation(String(field.key))}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-md border border-line bg-surface p-5 shadow-soft">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xl font-bold">PDF preview</h3>
                  {latestPacketReady ? (
                    <span className="text-sm font-semibold text-primary">Preview generated</span>
                  ) : null}
                </div>
                {packet?.generatedPdfPath ? (
                  <iframe
                    className="h-[720px] w-full rounded-md border border-line"
                    src={`/api/packets/${packet.id}/preview?v=${encodeURIComponent(packet.updatedAt)}`}
                    title="Preview generated PDF"
                  />
                ) : (
                  <div className="flex min-h-[280px] items-center justify-center rounded-md border border-dashed border-line bg-background text-muted">
                    Generate a complete packet to preview the filled TM.7 PDF.
                  </div>
                )}
              </section>
            </>
          ) : null}

          {activeConsole === "retirement" ? (
            <RetirementPanel
              workflow={retirementWorkflow}
              route={retirementRoute}
              cost={retirementCost}
              checklist={retirementChecklist}
              onWorkflowChange={setRetirementWorkflow}
              onChecklistToggle={toggleRetirementChecklistItem}
            />
          ) : null}

          {activeConsole === "profile" ? (
            <section id="profile" className="rounded-md border border-line bg-surface p-5 shadow-soft">
              <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <h2 className="text-2xl font-bold">Profile vault</h2>
                  <p className="text-sm text-muted">Reusable applicant details for TM.7 and future forms.</p>
                  <p className="mt-2 text-sm font-semibold text-primary">{message}</p>
                </div>
                <button
                  className="rounded-md bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover"
                  onClick={saveProfile}
                  disabled={busy !== null}
                >
                  Save profile
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {profileFields.map((field) => (
                  <Field
                    key={field.key}
                    label={field.label}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={String(profile[field.key] ?? "")}
                    onChange={(value) => setProfile((current) => ({ ...current, [field.key]: value }))}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {activeConsole === "documents" ? (
            <section id="documents" className="rounded-md border border-line bg-surface p-5 shadow-soft">
              <div className="mb-4">
                <h2 className="text-2xl font-bold">Document vault</h2>
                <p className="text-sm text-muted">
                  Optional storage and AI extraction. Checklist completion does not require uploads.
                </p>
              </div>
              <form
                className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_auto]"
                action={async (formData) => {
                  await uploadDocument(formData);
                }}
              >
                <label className="text-sm font-semibold">
                  Document type
                  <select
                    className="mt-1 w-full rounded-md border-line"
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value)}
                  >
                    <option value="passport">Passport</option>
                    <option value="visa_page">Visa page</option>
                    <option value="arrival_stamp">Arrival stamp</option>
                    <option value="tm30">TM30</option>
                    <option value="address_proof">Address proof</option>
                    <option value="tm6_card">TM.6 card</option>
                    <option value="photo">Passport photo</option>
                    <option value="signature">Signature</option>
                    <option value="supporting">Supporting</option>
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  File
                  <input className="mt-1 w-full rounded-md border-line" name="file" type="file" required />
                </label>
                <button
                  className="self-end rounded-md border border-line px-4 py-2 font-semibold"
                  type="submit"
                  disabled={busy !== null}
                >
                  <Upload className="mr-2 inline h-4 w-4" />
                  Upload
                </button>
              </form>

              <div className="mt-5 grid grid-cols-1 gap-3">
                {documents.length === 0 ? (
                  <div className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
                    No documents stored yet.
                  </div>
                ) : (
                  documents.map((document) => (
                    <div
                      className="flex flex-col justify-between gap-3 rounded-md border border-line p-4 md:flex-row md:items-center"
                      key={document.id}
                    >
                      <div>
                        <p className="font-semibold">{document.fileName}</p>
                        <p className="text-sm text-muted">
                          {document.type} · {Math.round(document.size / 1024)} KB
                        </p>
                        {document.extractedFields?.length ? (
                          <p className="mt-1 text-sm text-primary">
                            {document.extractedFields.length} AI suggestions ready for review
                          </p>
                        ) : null}
                      </div>
                      <button
                        className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold"
                        onClick={() => extractDocument(document)}
                        disabled={busy !== null}
                      >
                        {busy === document.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        AI extract
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function ChecklistPanel({
  checklist,
  onToggle
}: {
  checklist: Tm7DocumentChecklist;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return (
    <div className="mt-6 border-t border-line pt-5" data-testid="tm7-checklist-panel">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-lg font-bold">TM.7 document checklist</h3>
          <p className="text-sm text-muted">
            {checklist.summary.checkedRequiredDocuments}/{checklist.summary.requiredDocuments} required documents checked
          </p>
        </div>
        <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">
          {checklist.summary.checkedPrintChecks}/{checklist.summary.printChecks} print checks
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checklist.items.map((item) => {
          const isChecked = item.status === "checked";
          const checkboxId = `tm7-checklist-${item.id}`;
          const label =
            item.category === "print_review" ? "Print check" : item.required ? "Bring" : "Where applicable";
          return (
            <div
              className={`rounded-md border p-3 transition-colors ${
                isChecked ? "border-primary bg-primary-soft/40" : "border-line bg-white"
              }`}
              key={item.id}
            >
              <div className="flex items-start gap-3">
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) => onToggle(item.id, event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-line text-primary focus:ring-focus"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer font-semibold" htmlFor={checkboxId}>
                      {item.label}
                    </label>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        isChecked ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent"
                      }`}
                    >
                      {isChecked ? "Checked" : label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{item.description}</p>
                </div>
                {isChecked ? <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-primary" aria-hidden /> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RetirementPanel({
  workflow,
  route,
  cost,
  checklist,
  onWorkflowChange,
  onChecklistToggle
}: {
  workflow: RetirementWorkflowData;
  route: RetirementRouteResult;
  cost: RetirementCostEstimate;
  checklist: RetirementChecklist;
  onWorkflowChange: Dispatch<SetStateAction<RetirementWorkflowData>>;
  onChecklistToggle: (id: string, checked: boolean) => void;
}) {
  const routeStatus = route.canSelfFile ? "Self-fileable" : "Needs attention";

  return (
    <section id="retirement" className="rounded-md border border-line bg-surface p-5 shadow-soft">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-semibold text-primary">Agent-fee saver workflow</p>
          <h3 className="text-xl font-bold">Retirement visa self-filing</h3>
          <p className="mt-1 text-sm text-muted">
            Check whether a qualified applicant can prepare the retirement route without a full agent package.
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${
            route.canSelfFile ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent"
          }`}
        >
          {routeStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold text-ink">
          Age
          <input
            className="mt-1 w-full rounded-md border-line bg-white"
            min="0"
            type="number"
            value={workflow.age ?? ""}
            onChange={(event) =>
              onWorkflowChange((current) => ({
                ...current,
                age: event.target.value ? Number(event.target.value) : undefined
              }))
            }
          />
        </label>

        <label className="text-sm font-semibold text-ink">
          Current status
          <select
            className="mt-1 w-full rounded-md border-line bg-white"
            value={workflow.currentStatus ?? "unknown"}
            onChange={(event) =>
              onWorkflowChange((current) => ({
                ...current,
                currentStatus: event.target.value as RetirementWorkflowData["currentStatus"]
              }))
            }
          >
            <option value="tourist_visa">Tourist visa</option>
            <option value="visa_exempt">Visa exempt</option>
            <option value="non_o">Non-Immigrant O</option>
            <option value="non_oa">Non-Immigrant O-A</option>
            <option value="other">Other</option>
            <option value="unknown">Not sure</option>
          </select>
        </label>

        <label className="text-sm font-semibold text-ink">
          Current stay until
          <input
            className="mt-1 w-full rounded-md border-line bg-white"
            type="date"
            value={workflow.currentStayUntil ?? ""}
            onChange={(event) =>
              onWorkflowChange((current) => ({ ...current, currentStayUntil: event.target.value }))
            }
          />
        </label>

        <label className="text-sm font-semibold text-ink">
          Financial method
          <select
            className="mt-1 w-full rounded-md border-line bg-white"
            value={workflow.financialMethod ?? "not_sure"}
            onChange={(event) =>
              onWorkflowChange((current) => ({
                ...current,
                financialMethod: event.target.value as RetirementWorkflowData["financialMethod"]
              }))
            }
          >
            <option value="bank_deposit">800,000 THB deposit</option>
            <option value="monthly_income">65,000 THB monthly income</option>
            <option value="combination">Combination method</option>
            <option value="not_sure">Not sure</option>
          </select>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="flex items-start gap-3 rounded-md border border-line bg-background p-3 text-sm font-semibold">
          <input
            className="mt-1 h-5 w-5 rounded border-line text-primary focus:ring-focus"
            type="checkbox"
            checked={Boolean(workflow.hasThaiBankAccount)}
            onChange={(event) =>
              onWorkflowChange((current) => ({ ...current, hasThaiBankAccount: event.target.checked }))
            }
          />
          Thai bank account in applicant name
        </label>
        <label className="flex items-start gap-3 rounded-md border border-line bg-background p-3 text-sm font-semibold">
          <input
            className="mt-1 h-5 w-5 rounded border-line text-primary focus:ring-focus"
            type="checkbox"
            checked={Boolean(workflow.hasOverstay)}
            onChange={(event) =>
              onWorkflowChange((current) => ({ ...current, hasOverstay: event.target.checked }))
            }
          />
          Applicant is in overstay
        </label>
        <label className="text-sm font-semibold text-ink">
          Re-entry permit
          <select
            className="mt-1 w-full rounded-md border-line bg-white"
            value={workflow.reEntryPreference ?? "none"}
            onChange={(event) =>
              onWorkflowChange((current) => ({
                ...current,
                reEntryPreference: event.target.value as RetirementWorkflowData["reEntryPreference"]
              }))
            }
          >
            <option value="none">No re-entry</option>
            <option value="single">Single re-entry</option>
            <option value="multiple">Multiple re-entry</option>
          </select>
        </label>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-line bg-background p-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h4 className="font-bold">{route.title}</h4>
              <p className="mt-1 text-sm text-muted">{route.summary}</p>
            </div>
            <span className="w-fit rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">
              {route.primaryFormCodes.length ? route.primaryFormCodes.join(" + ") : "Confirm route"}
            </span>
          </div>
          {route.blockers.length ? (
            <div className="mt-3 rounded-md bg-accent-soft p-3 text-sm text-accent">
              <p className="font-semibold">Fix before self-filing</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {route.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-muted">
            VisaFiler prepares paperwork and checklists. It does not guarantee approval or replace local-office
            confirmation.
          </p>
        </div>

        <div className="rounded-md border border-line bg-background p-4">
          <h4 className="font-bold">DIY vs agent estimate</h4>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted">Official fees</p>
              <p className="text-lg font-bold text-ink">{formatThb(cost.officialFees)}</p>
            </div>
            <div>
              <p className="text-muted">Agent package</p>
              <p className="text-lg font-bold text-ink">
                {formatThb(cost.agentLow)}-{formatThb(cost.agentHigh)}
              </p>
            </div>
          </div>
          <p className="mt-3 rounded-md bg-primary-soft p-3 text-sm font-semibold text-primary">
            {route.canSelfFile
              ? `Estimated saving: ${formatThb(cost.savingsLow)}-${formatThb(cost.savingsHigh)}`
              : "Resolve the route blockers before estimating self-filing savings."}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
          <div>
            <h4 className="font-bold">Retirement document checklist</h4>
            <p className="text-sm text-muted">
              {checklist.summary.checkedRequired}/{checklist.summary.totalRequired} required items checked
            </p>
          </div>
          <span className="w-fit rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">
            Uploads optional
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {checklist.items.map((item) => {
            const isChecked = item.status === "checked";
            const checkboxId = `retirement-checklist-${item.id}`;
            return (
              <label
                className={`flex items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                  isChecked ? "border-primary bg-primary-soft/40" : "border-line bg-white"
                }`}
                htmlFor={checkboxId}
                key={item.id}
              >
                <input
                  id={checkboxId}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-line text-primary focus:ring-focus"
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) => onChecklistToggle(item.id, event.target.checked)}
                />
                <span>
                  <span className="block font-semibold">{item.label}</span>
                  <span className="mt-1 block text-muted">{isChecked ? "Checked" : "Bring to immigration"}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="text-sm font-semibold text-ink">
      {label}
      <input
        className="mt-1 w-full rounded-md border-line bg-white"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status.replaceAll("_", " ");
  const isReady = status === "ready_for_review" || status === "approved" || status === "exported";
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-semibold ${
        isReady ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent"
      }`}
    >
      {label === "ready for review" ? "Ready for review" : label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
}
