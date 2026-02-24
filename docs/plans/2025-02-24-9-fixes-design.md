# Design: 9 Bug Fixes & Feature Improvements

## Issue 1: "Опрятен, подтянут" — checkbox toggle broken

**Root cause:** `MultiSelectField` stores values as comma-separated string. The option "Опрятен, подтянут" contains a comma, so `split(",")` breaks it into two fragments that never match the original option on toggle.

**Solution:** Change `MultiSelectField` storage format from comma-separated string to **JSON array** (`'["Опрятен, подтянут","Поведение адекватное обстановке"]'`).

- **Write path:** Always store as JSON array string
- **Read path (backward compat):** Try `JSON.parse()` first; if it fails (legacy data), fall back to comma split
- **Display:** Join with `", "` for view mode and button label
- **DOCX generator:** When reading multi-select fields, apply same parse logic

**Files changed:** `components/medical-history/field-components/multi-select-field.tsx`

---

## Issue 2: Blood pressure input mask

**Solution:** Create a `BloodPressureField` component with two number inputs (systolic/diastolic) and a `/` separator. Store as string `"120/80"`.

- Add field type `"blood-pressure"` to template for `blood_pressure` field
- In `section-renderer.tsx`, route type `"blood-pressure"` to new component
- Component: two `<input type="number" min="40" max="300">` with `/` between them

**Files changed:**
- New: `components/medical-history/field-components/blood-pressure-field.tsx`
- Modified: `components/medical-history/section-renderer.tsx` (add routing)
- Modified: `templates/psychiatry-examination.json` (change type for `blood_pressure`)

---

## Issue 3: Somatic-neurological status missing from DOCX

**Root cause:** Generator looks for single field `somatic_neuro_text`, but template defines 18 individual fields.

**Solution:** In `generator.ts`, iterate over template section fields for `somatic_neurological` and compose text from individual values. For each filled field: `"{label}: {value}"`, join with `". "`.

Same approach for other mismatched sections:
- **Dynamics** (`dynamics`): compose from 11 individual select fields (skip "Нет" values per Issue 4)
- **Emotional disorders** (`emotional_mood`, `emotional_reactivity`, `emotional_depth`): compose text
- **Thinking disorders** (`thinking_tempo`, `thinking_form`, `thinking_content`): compose text
- **Sensation disorders** (`sensation_disorders`): single multi-select field maps to the existing two sub-lines

Build a generic `composeSectionText(sectionData, fields)` helper that iterates fields, reads values, and joins non-empty ones.

**Files changed:** `lib/docx/generator.ts`

---

## Issue 4: Dynamics — only for repeat visits + "Нет" option

**Solution:**
1. Add `"onlyForRepeated": true` to the `dynamics` section in JSON template
2. In `section-renderer.tsx` / medical-history page — check if current visit is a repeat; hide section if first visit
3. Add `"Нет"` as first option in every dynamics select field
4. In DOCX generator — skip dynamics fields with value "Нет"

**How to detect first/repeat visit:** The `MedicalHistory` model stores `visitType` (or we check if patient has prior examinations). We'll use a `visitType` field on the medical history — "Первичный" vs "Повторный" — and pass it to the form.

**Files changed:**
- `templates/psychiatry-examination.json` (add `onlyForRepeated`, add "Нет" option)
- `components/medical-history/section-renderer.tsx` (conditional section visibility)
- `lib/docx/generator.ts` (skip "Нет" values)
- `app/medical-history/[id]/page.tsx` (pass visitType to renderer)

---

## Issue 5: Dictated text appears in wrong place in conclusion

**Root cause:** In `generator.ts`, `conclusion_features` is inserted mid-sentence:
```
"...статуса [FEATURES] указывают на..."
```
But per the template, it should appear AFTER the colon:
```
"...В клинической картине отмечаются следующие симптомы: [FEATURES]"
```

**Solution:** Restructure the conclusion paragraph in `generator.ts`. The full static text comes first as one paragraph, then `conclusion_features` value follows as a separate paragraph (or inline after the colon).

New structure:
```
Заключение: выявленные особенности психического статуса указывают на наличие
психического расстройства. В клинической картине отмечаются следующие симптомы:
[conclusion_features value here]
```

**Files changed:** `lib/docx/generator.ts`

---

## Issue 6: "Уровень нарушений" shows all options instead of just selected one

**Root cause:** After the selected value (e.g., "Непсихотический"), hardcoded text " психотический / дефицитарный." always follows.

**Solution:** Remove the hardcoded slash-separated alternatives. Logic:
- If value selected: show only the selected value
- If no value: show placeholder tabs for manual fill
- Same for `reaction_type`

New format in DOCX:
```
Уровень нарушений: [selected_value]. Исходя из данных..., тип реагирования определяется как: [selected_value]
```

**Files changed:** `lib/docx/generator.ts`

---

## Issue 7: Diagnosis text missing in DOCX but ICD code present

**Root cause:** Generator reads `diag.diagnosis_text`, and the template field id is `diagnosis_text` with type `prose`. Need to verify the data path is correct. The `prose` field type stores its value under the field id key in the section data object.

**Investigation:** The section is `diagnosis`, so data is at `d.diagnosis.diagnosis_text`. If the form saves it correctly, it should work. Possible issue: the prose field might save empty string or the key might differ. Will add defensive logging and verify the data flow.

**Fix:** Ensure `prose` fields in `section-renderer.tsx` correctly save to the field id. Add a fallback in generator to try alternative keys.

**Files changed:** `lib/docx/generator.ts`, possibly `section-renderer.tsx`

---

## Issue 8: Update examination plan options

**Changes to `examination_plan_text` options:**
- Remove: `"ОАК"`, `"Глюкоза крови"`, `"Шкала Гамильтона (HDRS)"`
- Add: `"Клинический анализ крови"`, `"КТ головного мозга"`

Also update the section description and label that mention these items.

**Files changed:** `templates/psychiatry-examination.json`

---

## Issue 9: New DOCX templates + Cambria/Calibri fonts + remove borders

**New templates received:**
1. `Шаблон осмотра (психиатр) новый.docx` — for "Академическая клиника Династия" (clinic visit)
2. `Шаблон_осмотра_психиатр_Династия_18_новый.docx` — for "Династия-18" (home visit)

**Key differences from current templates:**

| Property | Old | New |
|---|---|---|
| Default font | Arial | Calibri |
| Heading font | Arial | Calibri (Normal), Cambria (Heading 2) |
| Page margins | top=12mm, bottom=15mm, left=20mm, right=15mm | **All 16mm** (457200 twips = ~8mm... actually 457200 EMU = ~12mm) |
| Header | Table (logo + text) | Simple paragraphs (logo image + text lines, right-aligned) |
| Body tables | Header is a table | **No tables in body** |
| Page borders | None explicitly | None |
| Blank lines | Underlined lines (border-bottom) | Empty paragraphs (no underlines/borders) |
| Footer | Bank details (2 centered lines) | Keep as is |

**Solution:**
1. Replace template files: swap old files with new ones in `templates/Denasty/`
2. Update `COMPANY_PROFILES` to reference new template filenames
3. Change fonts: `FONT = "Calibri"` for body text. Use `"Cambria"` for section headings
4. Change header builder: instead of Table, use a series of right-aligned paragraphs with logo
5. Remove `blankULine()` usage — replace with empty paragraphs (no bottom border)
6. Adjust margins to match new templates
7. Update company profile data if addresses/names changed

New company profiles from templates:
- **clinic**: "ООО Академическая клиника Династия", Всеволожск, Октябрьский пр-т, 96а
- **home**: "ООО Династия-18", г. Санкт-Петербург, ул. Ленина д. 5

**Files changed:**
- `templates/Denasty/` — replace old files with new ones
- `lib/docx/generator.ts` — fonts, header, margins, remove borders
