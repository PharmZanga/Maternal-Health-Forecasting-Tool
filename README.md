# Maternal health equipment and device forecast

Open `maternal-needs-forecast.html` in a browser, or serve the repository as a static site using `index.html`. The consultation prototype runs locally with no server or installation. Keep `equipment-forecast.js` alongside the HTML file.

The tool opens with a fictional maternity centre and a worked example. Change the number of years to explore the results, then select **Start a real plan** to enter your own facility information. Downloads of the example are labeled as dummy data.

## Workflow

1. Choose a first calendar year and 1–20 forecast years. Enter the facility and, for estimated costs, its currency.
2. Add an item from the catalog or enter custom equipment. Single-use devices start excluded to avoid overlap with other forecasting platforms. Use a separate plan for each facility.
3. Start with a fixed number of units, or choose annual service workload or a service-point norm. Enter working units, out-of-service units and useful life to project reusable replacements. Record local evidence under optional item details.
4. Enter functional and nonfunctional opening inventory and annual retirements, confirmed repairs and funded arrivals. Only count supply usable by the need date. Enter verified zeros for opening inventory. Blank annual adjustments are treated as zero.
5. Review yearly requirements, procurement gaps and costed subtotals. Save a JSON plan before refreshing, or export an annual CSV for consolidation.

## Calculation

- Workload starts with the annual event count in the first forecast year, compounds at the entered growth rate in later years, and applies the eligible share and target coverage. Reusable requirement divides eligible workload by annual usable capacity. Single-use requirement multiplies it by units per eligible event. A service-point norm multiplies planned points by units per point. The model applies the buffer, rounds up and enforces the minimum.
- Each year's gap is the positive difference between the requirement and available units after retirements, repairs and arrivals. Existing units and confirmed supply follow the entered retirement schedule. Projected purchases remain in the usable stock until their modeled useful life ends. Single-use devices are deducted as used. Projected purchases are assumed to arrive by the need date.
- Unknown opening inventory or an invalid supply adjustment prevents reliable net estimates for later years. Costed subtotals omit unknown costs. Costs use the same landed unit price in every year.

Workbook data can be entered into the browser form. The application saves its own JSON format and exports CSV. Earlier planning or questionnaire JSON files use a separate format.

## Supporting instruments

- [Equipment data collection workbook](outputs/unfpa-instruments/Maternal_Equipment_Data_Collection.xlsx)
- [Stakeholder assessment questionnaire](outputs/unfpa-instruments/Stakeholder_Assessment_Questionnaire.docx)

## Verification

Run `node verify-forecast.cjs` to check the annual forecast, replacements, incomplete inputs and saved plans. The previous prototype can be rebuilt with `python enhance.py` and tested with `node verify.cjs` using the generated legacy HTML under `tmp`.
