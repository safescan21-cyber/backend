import { useState, useEffect } from "react";

// Static project/case-study data — sectors we supply material & equipment to.
const PROJECTS_DATA = [
  // ---- PHARMA PROJECTS (updated with real Indian pharma customers) ----
  {
    id: "proj-001",
    sector: "Pharma",
    title: "Tablet Coating Line Upgrade",
    client: "Sun Pharma, Mumbai",
    description:
      "Supplied precision checkweighing and HPLC-based QC instrumentation for a tablet coating and packaging line, ensuring batch-level compliance with GMP standards.",
    materials: ["Checkweighers", "HPLC Systems", "Stainless Steel Fittings", "Calibration Weights"],
    image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=800&auto=format&fit=crop",
    stats: { value: "99.8%", label: "Weighing Accuracy" },
    challenge:
      "The client's existing weighing setup lacked the precision required for new regulatory audits, and manual HPLC calibration was creating bottlenecks on the coating line.",
    solution:
      "We supplied a fully calibrated checkweighing array integrated directly into the coating line, paired with an HPLC system configured for rapid QC sampling and GMP-compliant audit trails.",
    results: [
      "Weighing accuracy improved to 99.8%, exceeding the client's audit threshold.",
      "QC sampling time per batch reduced by roughly 40%.",
      "Zero non-conformance findings in the subsequent regulatory audit.",
    ],
  },
  {
    id: "proj-005",
    sector: "Pharma",
    title: "Sterile API Manufacturing Support",
    client: "Cipla Ltd., Pune",
    description:
      "Supported clean-room grade instrumentation supply for active pharmaceutical ingredient (API) production, including analytical testing equipment.",
    materials: ["HPLC Columns", "Cleanroom-Rated Enclosures", "Analytical Balances"],
    image: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?q=80&w=800&auto=format&fit=crop",
    stats: { value: "100%", label: "GMP Compliant" },
    challenge:
      "The client's API production facility needed cleanroom-grade analytical instrumentation to meet stricter export-market GMP requirements.",
    solution:
      "We supplied cleanroom-rated enclosures, HPLC columns, and high-precision analytical balances suited to sterile manufacturing environments, along with documentation to support compliance audits.",
    results: [
      "Facility achieved 100% GMP compliance on the relevant audit cycle.",
      "Analytical turnaround time for batch release testing improved.",
      "Instrumentation now supports export-market certification requirements.",
    ],
  },
  {
    id: "proj-pharma-01",
    sector: "Pharma",
    title: "High‑Speed Tablet Compression Line",
    client: "Dr. Reddy's Laboratories, Hyderabad",
    description:
      "Supplied a complete set of tablet press tooling (punches & dies) and in‑process checkweighing for a new high‑speed compression line, boosting output and reducing tool wear.",
    materials: ["Punches & Dies", "Checkweighers", "Dust Extraction Systems", "Hardness Testers"],
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800&auto=format&fit=crop",
    stats: { value: "2.5L", label: "Tablets / Hour" },
    challenge:
      "The existing compression line was producing tablets with weight variation beyond acceptable limits, causing frequent line stoppages and high rejection rates.",
    solution:
      "We supplied custom-engineered punches and dies with improved wear resistance, paired with high‑speed checkweighers to monitor weight in real time. We also provided hardness testers to ensure tablet integrity.",
    results: [
      "Line throughput increased to 2.5 lakh tablets per hour with consistent weight uniformity.",
      "Tool life extended by 40% due to better materials and maintenance protocols.",
      "Rejection rate dropped from 5.2% to under 1%.",
    ],
  },
  {
    id: "proj-pharma-02",
    sector: "Pharma",
    title: "Automated Liquid Filling & Capping",
    client: "Lupin Ltd., Goa",
    description:
      "Designed and supplied a fully automated liquid filling and capping system for an oral liquid production facility, including level sensors and torque testers.",
    materials: ["Liquid Filling Nozzles", "Capping Heads", "Torque Testers", "Level Sensors"],
    image: "https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?q=80&w=800&auto=format&fit=crop",
    stats: { value: "200", label: "Bottles / Minute" },
    challenge:
      "Manual filling and capping were creating inconsistencies in fill volume and cap torque, leading to leaks and customer complaints.",
    solution:
      "We installed a multi-head filling system with servo‑controlled nozzles for precise volume, and capping heads with torque monitoring. Inline level sensors automatically reject under/over filled bottles.",
    results: [
      "Line now runs at 200 bottles per minute with ±1% fill accuracy.",
      "Torque consistency improved by 90%, eliminating leakage complaints.",
      "Operator intervention reduced, freeing staff for other tasks.",
    ],
  },
  {
    id: "proj-pharma-03",
    sector: "Pharma",
    title: "Blister Packaging Line Automation",
    client: "Aurobindo Pharma, Hyderabad",
    description:
      "Integrated a blister packaging line with vision inspection and reject systems to ensure flawless pack integrity and reduce manual inspection.",
    materials: ["Blister Forming Dies", "Vision Inspection Cameras", "Reject Systems", "Temperature Controllers"],
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800&auto=format&fit=crop",
    stats: { value: "350", label: "Blister Packs / Min" },
    challenge:
      "Manual visual inspection of blister packs was slow and error‑prone, with occasional defects reaching customers.",
    solution:
      "We installed high‑resolution vision cameras that inspect every cavity for missing tablets, discoloration, or seal defects, coupled with a pneumatic reject system. Temperature controllers were upgraded for consistent sealing.",
    results: [
      "Line speed increased to 350 blister packs per minute.",
      "Defect escape rate dropped to near zero, improving customer satisfaction.",
      "Inspection data is now logged for traceability and batch release.",
    ],
  },
  {
    id: "proj-pharma-04",
    sector: "Pharma",
    title: "QC Lab Automation – Dissolution & Assay",
    client: "Zydus Lifesciences, Ahmedabad",
    description:
      "Supplied automated dissolution testers and assay equipment for the quality control lab to expedite batch testing and reduce manual errors.",
    materials: ["Dissolution Testers", "Automated Samplers", "UV-Vis Spectrophotometers", "Data Integration Software"],
    image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=80&w=800&auto=format&fit=crop",
    stats: { value: "30%", label: "Testing Time Reduced" },
    challenge:
      "The QC lab was struggling with manual dissolution testing, causing delays in batch release and strain on the analytical team.",
    solution:
      "We provided automated dissolution testers with built‑in samplers and connected them to UV‑Vis spectrophotometers. Data integration software automatically compiles results into a LIMS system.",
    results: [
      "Testing time for dissolution and assay reduced by 30%.",
      "Manual handling errors virtually eliminated.",
      "Batch release turnaround improved by 2 days on average.",
    ],
  },
  {
    id: "proj-pharma-05",
    sector: "Pharma",
    title: "Material Handling & Weighing for API Plant",
    client: "Mylan Laboratories (now Viatris), Bengaluru",
    description:
      "Supplied heavy-duty platform scales and material handling equipment for a multi‑product API manufacturing facility to improve inventory accuracy and workflow.",
    materials: ["Platform Scales", "Pallet Jacks", "Dust-Proof Weighing Terminals", "Barcode Scanners"],
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop",
    stats: { value: "99.9%", label: "Weighing Accuracy" },
    challenge:
      "Manual weighing of raw materials was prone to errors and did not provide real‑time inventory updates, leading to material shortages and production delays.",
    solution:
      "We installed rugged, dust‑proof platform scales with integrated terminals that capture weight data and update the ERP system via barcode scanning. Pallet jacks and carts were also supplied to improve material flow.",
    results: [
      "Weighing accuracy of 99.9% achieved, reducing material variance.",
      "Real‑time inventory visibility eliminated raw material stockouts.",
      "Material handling time per batch reduced by 25%.",
    ],
  },

  // ---- FMCG (existing) ----
  {
    id: "proj-002",
    sector: "FMCG",
    title: "High-Speed Packaging Line Retrofit",
    client: "National FMCG Brand, Maharashtra",
    description:
      "Provided in-line checkweighing systems and conveyor-integrated sensors for a high-speed soap and detergent packaging line, reducing fill-weight rejects.",
    materials: ["In-line Checkweighers", "Conveyor Sensors", "Reject Mechanisms", "PLC Interfaces"],
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop",
    stats: { value: "32%", label: "Reject Reduction" },
    challenge:
      "Fill-weight variance on the high-speed packaging line was triggering excessive product rejects, eating into margins on a high-volume SKU.",
    solution:
      "We retrofitted the line with in-line checkweighers wired into the existing PLC, along with conveyor-mounted sensors to catch variance earlier and divert only genuine out-of-spec units.",
    results: [
      "Product rejects dropped by 32% within the first month.",
      "Line speed maintained at full throughput with no slowdown.",
      "Real-time fill-weight data now feeds directly into the plant's PLC dashboard.",
    ],
  },
  {
    id: "proj-006",
    sector: "FMCG",
    title: "Beverage Bottling Quality Control",
    client: "Beverage Bottling Plant, Punjab",
    description:
      "Supplied checkweighing and fill-level verification systems integrated into an automated bottling and crating line.",
    materials: ["Fill-Level Sensors", "Checkweighers", "Crate Counters"],
    image: "https://images.unsplash.com/photo-1571166052725-fa1ee7b3284e?q=80&w=800&auto=format&fit=crop",
    stats: { value: "12K", label: "Bottles / Hour" },
    challenge:
      "Inconsistent fill levels on the bottling line were causing customer complaints and occasional regulatory flags on declared volume.",
    solution:
      "We installed fill-level sensors and checkweighers at the bottling stage, plus automated crate counters at the end of the line for accurate dispatch records.",
    results: [
      "Line now sustains 12,000 bottles per hour with consistent fill accuracy.",
      "Customer complaints related to fill level dropped to near zero.",
      "Crate counting is now fully automated, removing manual tally errors.",
    ],
  },

  // ---- Metal (existing) ----
  {
    id: "proj-003",
    sector: "Metal",
    title: "Rolling Mill Process Instrumentation",
    client: "Steel Rolling Mill, Jharkhand",
    description:
      "Delivered rugged industrial-grade sensors and weighing platforms built to withstand high-temperature, high-dust environments on a hot rolling mill floor.",
    materials: ["Heavy-Duty Load Cells", "Dust-Proof Enclosures", "Industrial Sensors", "Junction Boxes"],
    image: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?q=80&w=800&auto=format&fit=crop",
    stats: { value: "24/7", label: "Continuous Duty Rated" },
    challenge:
      "Standard sensors and load cells were failing prematurely under the mill's high heat and dust exposure, forcing frequent unplanned downtime.",
    solution:
      "We sourced and supplied heavy-duty, dust-proof load cells and sealed junction boxes rated for continuous duty in high-temperature environments, matched to the mill's existing control architecture.",
    results: [
      "Sensor failure rate dropped sharply after installation.",
      "Mill now runs the new instrumentation on a 24/7 continuous duty cycle.",
      "Unplanned downtime related to instrumentation failure reduced significantly.",
    ],
  },

  // ---- Cement (existing) ----
  {
    id: "proj-004",
    sector: "Cement",
    title: "Bulk Bagging & Dispatch Weighing",
    client: "Cement Plant, Rajasthan",
    description:
      "Installed bulk bag-filling weighbridge systems and dust-resistant load cells to streamline dispatch operations and improve loading accuracy.",
    materials: ["Weighbridge Load Cells", "Bag Filling Scales", "Dust-Resistant Housings", "Control Panels"],
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?q=80&w=800&auto=format&fit=crop",
    stats: { value: "15K+", label: "Bags Processed / Day" },
    challenge:
      "Manual weighbridge checks during dispatch were slowing down truck turnaround and introducing inconsistencies in bag-fill weights.",
    solution:
      "We supplied dust-resistant weighbridge load cells and automated bag-filling scales tied into a central control panel, letting dispatch staff verify weights in seconds instead of manually re-checking loads.",
    results: [
      "Dispatch now processes over 15,000 bags per day without bottlenecks.",
      "Truck turnaround time at the weighbridge cut considerably.",
      "Bag-fill weight consistency improved across all shifts.",
    ],
  },
];

const SECTORS = ["All", "Pharma", "FMCG", "Metal", "Cement"];

const sectorColors = {
  Pharma: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  FMCG: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Metal: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  Cement: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

const CaseStudyModal = ({ project, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!project) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-48 overflow-hidden rounded-t-xl">
          <img
            src={project.image}
            alt={project.title}
            className="h-full w-full object-cover"
          />
          <button
            onClick={onClose}
            aria-label="Close case study"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            ✕
          </button>
          <span
            className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-xs font-semibold ${sectorColors[project.sector]}`}
          >
            {project.sector}
          </span>
        </div>

        <div className="p-6">
          <h3 className="text-2xl font-bold text-white">{project.title}</h3>
          <p className="mt-1 text-sm uppercase tracking-wide text-slate-500">
            {project.client}
          </p>

          <div className="mt-4 inline-flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-2">
            <p className="text-2xl font-bold text-cyan-400">
              {project.stats.value}
            </p>
            <p className="text-xs text-slate-500">{project.stats.label}</p>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-400">
              Challenge
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {project.challenge}
            </p>
          </div>

          <div className="mt-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-400">
              Solution
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {project.solution}
            </p>
          </div>

          <div className="mt-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-400">
              Results
            </h4>
            <ul className="mt-2 space-y-2">
              {project.results.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-300"
                >
                  <span className="mt-1 text-cyan-400">▸</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-400">
              Materials &amp; Equipment Supplied
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {project.materials.map((m) => (
                <span
                  key={m}
                  className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-7 w-full rounded-lg border border-slate-700 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const Projects = () => {
  const [activeSector, setActiveSector] = useState("All");
  const [selectedProject, setSelectedProject] = useState(null);

  const filteredProjects =
    activeSector === "All"
      ? PROJECTS_DATA
      : PROJECTS_DATA.filter((p) => p.sector === activeSector);

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white">Our Projects</h2>
        <p className="mt-3 max-w-2xl text-slate-400">
          Explore our industrial solutions and case studies. We supply
          precision instrumentation and materials to pharma, FMCG, metal, and
          cement manufacturers across India.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {SECTORS.map((sector) => (
          <button
            key={sector}
            onClick={() => setActiveSector(sector)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeSector === sector
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            {sector}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="group overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-cyan-500/5"
          >
            <div className="relative h-44 overflow-hidden">
              <img
                src={project.image}
                alt={project.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span
                className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-xs font-semibold ${sectorColors[project.sector]}`}
              >
                {project.sector}
              </span>
            </div>

            <div className="p-5">
              <h3 className="text-lg font-semibold text-white">
                {project.title}
              </h3>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                {project.client}
              </p>
              <p className="mt-3 text-sm text-slate-400">
                {project.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {project.materials.map((m) => (
                  <span
                    key={m}
                    className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300"
                  >
                    {m}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
                <div>
                  <p className="text-xl font-bold text-cyan-400">
                    {project.stats.value}
                  </p>
                  <p className="text-xs text-slate-500">
                    {project.stats.label}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProject(project)}
                  className="text-sm font-medium text-slate-400 hover:text-cyan-400"
                >
                  View Case Study →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <p className="mt-10 text-center text-slate-500">
          No projects found for this sector yet.
        </p>
      )}

      {selectedProject && (
        <CaseStudyModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
};

export default Projects;