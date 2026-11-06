# Maternal needs forecaster

An offline planning prototype for maternal health equipment, devices and birth-related resources. The instruments and product definitions are consultation drafts prepared in the context of a UNFPA consultancy. They are not approved UNFPA publications or validated national standards.

## Clarified country questionnaire

The opening **Country questionnaire** follows `UNFPA_Country_Questionnaire_Clarified_Equipment_Workload.xlsx`. It includes 30 country questions, 16 birth pathway questions, configurable national levels of care, service availability, mutually exclusive birth modes, overlapping complication records, and 53 illustrative items across equipment, medicines, surgical supplies and laboratory diagnostics. Only reference questions and product labels were extracted; no coordinator details or country responses were published. Additional choices in the workbook's Option Lists are retained for D01 and D03, whose inline grids stop at eight options.

Equipment workload and capacity are separate inputs. Annual eligible workload is divided by one reusable device's capacity (daily throughput × operating days × usable capacity). Single-use products instead use units per patient per event × repeat frequency. A norm method supports staff, team, room, bed and facility norms. Clinical factors and capacity assumptions require country evidence; medicine doses and clinical use factors are not prefilled.

Product records capture classification, multiple services and indications, birth pathway, care stage, stock, replacements, confirmed supply, dates, costs and validation sources. Gross requirements, available supply and net gaps remain distinct. Duplicate records for the same product variant and facility require consolidation. National pooled workloads cannot generate a facility procurement gap. Eligible workload is not rounded before equipment capacity division.

Save and restore this module with **Save questionnaire JSON** and **Load questionnaire JSON**, or export inputs and calculated results as CSV. Incomplete drafts can be saved; invalid numeric inputs must be corrected first. The original workbook is unchanged. Earlier assessments remain under **Service mapping**, the previous broad questionnaire under **Clinical context**, and existing equipment JSON files under **Equipment forecast**. These formats are separate and do not import XLSX data automatically.

[Open the application in your browser](https://pharmzanga.github.io/Maternal-Health-Forecasting-Tool/).

The **Service mapping** tab follows the earlier country assessment workbook. It includes ten countries and their source region codes, 17 services across five reporting facility levels, 13 annual service indicators, 35 equipment and consumable mappings, and partner validation roles. Independent service flags prevent “not provided” from contradicting another affirmative answer. Save and restore country assessments with JSON, or export CSV for review. These exports are separate from equipment planning files and do not automatically synchronise with Excel.

Country focal-point names are omitted from the public application and reference data. Somalia's source region code `AS` is preserved with a confirmation note. Service mappings are consultation references and do not automatically create procurement quantities. The revised country workbook with the original focal-point list is retained locally and excluded from this repository.

Download or clone this repository, then open [maternal-needs-forecast.html](maternal-needs-forecast.html) in a modern browser. It is a self-contained HTML application and needs no installation or server. `maternal-needs-forecast.original.html` preserves the initial application used to build this version.

## Assessment and collection instruments

- [Stakeholder assessment questionnaire (Word)](outputs/unfpa-instruments/Stakeholder_Assessment_Questionnaire.docx): six pages covering existing forecasting, equipment readiness, data availability, user needs, security, interoperability and acceptance testing.
- [Equipment data collection workbook (Excel)](outputs/unfpa-instruments/Maternal_Equipment_Data_Collection.xlsx): ten worksheets for facility information, inventory, services, consumption, orders, assumptions and calculated requirements. Supports demographic, morbidity, consumption and stock norm methods. The starter catalog covers the seven product categories identified in the consultancy ToR.

The instruments contain blank collection fields and provisional product definitions. Pilot them with stakeholders before collecting country data. Workbook formulas were checked in Microsoft Excel with synthetic data, which was removed before publication. The workbook and HTML prototype are separate tools; they do not automatically synchronise. Do not commit completed questionnaires, contact details, facility records or planning data to this public repository.

## Equipment planning

1. Set monthly facility births, planning months, delivery mix and complication rates in Facility forecast.
2. Open Equipment forecast and identify the facility, assessment date and cost currency.
3. Validate the illustrative equipment list and assumptions against the local service package. Enter minimum readiness units, monthly events per device, usable capacity and peak allowance.
4. Enter inventory and supply counts for each category. Use zero when verified none; blanks remain unknown. Functional and nonfunctional are separate counts. Retiring units are a subset of functional units, and confirmed repairs cannot exceed nonfunctional units.
5. Enter oldest functional asset age, expected life, procurement lead time and landed cost. Review retirement counts against the asset register. Confirm that repairs and incoming units will be usable before needed.
6. Export equipment CSV for review. Save planning data downloads a JSON file containing facility assumptions, equipment inputs and questionnaire answers. Load planning data restores it. Data is held in memory until saved; closing or refreshing the page loses unsaved entries.

Required units are the larger of minimum readiness units and rounded-up activity divided by usable device capacity, after a peak demand allowance. Surviving supply subtracts functional units retiring during the horizon and adds confirmed repairs and arrivals. The positive difference is the procurement gap. Costs sum only gap units with a supplied landed unit cost; incomplete inventory and uncosted gaps are explicitly reported.

The complications driver sums pre-eclampsia, haemorrhage and sepsis workload. It is a proxy for device uses, and overlapping complications may count multiple uses. It does not estimate distinct patients or model concurrency, queues, daily seasonality, oxygen flow, sterilizer batch volumes or installation constraints. Enter capacities that reflect the actual operating workflow. Age flags prompt review; replacements are manually scheduled because individual asset ages are not recorded here. This is a category-level inventory, not an individual asset register. Forecast individual facilities before aggregating; the tool currently edits one facility at a time.

## Questionnaire and existing model

The questionnaire adds equipment standards, inventory verification, maintenance, workforce, infrastructure, compatibility, training, procurement, financing and evidence questions. These are qualitative assessment inputs; they do not populate equipment inventory automatically. Annual births can calibrate facility activity only when marked Single facility. Country and district figures need separate facility allocations.

The existing commodity assumptions and clinical messages are inherited from the supplied application and were not clinically validated in this update. Equipment defaults are illustrative, not WHO, UNFPA or national norms. Validate assumptions and clinical protocols with the responsible local team. The commodity buffer now excludes staff hours and bed-days. Staffing remains an activity-based FTE estimate, not a shift-coverage roster. Existing commodity forecasts do not net out stock on hand or outstanding orders.

## Verification and maintenance

Run `node verify.cjs` for script initialization and calculation checks, unknown inventory handling, repair and replacement validation, cost handling, activity linkage, buffer behavior, CSV escaping, JSON round trip and malformed-file rejection. The test uses a lightweight DOM stub, not a browser engine. Browser visual verification was unavailable because browser policy blocked local file navigation.

`equipment.js` contains the embedded equipment module. `python enhance.py` rebuilds the deliverable from the preserved original and that module. Changes to the generated HTML should instead be reflected in those sources before rebuilding.
