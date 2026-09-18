<div align="center">
  <h1>⚖️ CounterNotice</h1>
  <p><b>Crumpled eviction notice in. Cited statutory defense out. Twenty seconds.</b></p>
  <p><i>A first-mile legal tool for the tenant with 72 hours, no lawyer, and everything to lose.</i></p>

  <img src="https://via.placeholder.com/800x450/f8fafc/0f172a?text=Demo+Video+Placeholder+(Replace+with+docs/demo.gif)" alt="CounterNotice Demo" width="100%" style="border-radius: 12px; margin: 20px 0;" />

  <p>
    <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
    <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
    <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://ai.google.dev"><img src="https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Google Gemini" /></a>
    <img src="https://img.shields.io/badge/LexHack_2026-Winner's_Build-1D4ED8?style=for-the-badge" alt="LexHack 2026" />
  </p>
</div>

<br />

## 🛑 The 30-Second Gap

> **Most eviction judgments are defaults.** Tenants lose not because they are wrong on the merits, but because the clock runs out before they file a response. 
> 
> Meanwhile, a massive share of notices are defective in ways a lawyer spots instantly (wrong notice period, improper delivery, missing mandatory clauses). Legal aid turns away most applicants for capacity. The 30 seconds between *a notice taped to the door* and *knowing if you have a legal defense* is the least-served moment in the justice system.

## 💡 The Solution

**CounterNotice occupies that 30-second gap.** Photograph the notice on your phone. Twenty seconds later, you receive:
- 🚨 **A Verdict Card:** Red/Green status detailing exactly which statutory rules were violated.
- 🔍 **A Diff-Style Why Panel:** The notice's own words compared side-by-side with verbatim Texas law.
- ⏰ **A Deadline Shield:** An `.ics` calendar export calculated using precise Texas day-counting rules.
- 📄 **A Print-Ready Auto-Letter:** A deterministic dispute letter citing the exact statutes, ready to print or email.

*(If the notice is perfectly legal, the app tells the truth and pivots to a good-faith negotiation letter instead of inventing a false defense).*

---

## 🏗️ Architecture (LLM Extracts → Rules Decide)

```mermaid
flowchart TD
    A["📷 Photo of notice"] --> B["Gemini Flash (Extraction Only)<br/>responseSchema → strict JSON"]
    B --> C["ExtractedFacts (Typed Contract)<br/>src/lib/engine/types.ts"]
    C --> D["Deterministic Rules Engine (Zero LLM)<br/>rules.json · Tex. Prop. Code § 24.005"]
    D --> E["🚨 Verdict Card + Why Panel"]
    D --> F["⏰ Deadline Shield (.ics)"]
    D --> G["📄 Print-Ready Letter"]
    D --> H["🤝 Honest Path (Negotiation)"]
    C -. "out of state / unreadable" .-> I["🛑 Refuses to guess"]