import { IProjectSettings } from "./Interfaces";
import { Plugin } from "./Main";

// eslint-disable-next-line no-unused-vars
export class DashboardPage {
    settings: IProjectSettings;
    SIGNOption = {
        "type": "SIGN",
        "controlState": ControlState.Print,
        "dummyData": false,
        "parent": "F-SIGN-10",
        "parameter": { "readonly": false, "inlineHelp": "" },
        "isItem": true,
        "isDialog": false,
        "isForm": true,
        "canEditLinks": false,
        "canEdit": false,
        "canEditLabels": false,
        "canEditTitle": false,
        "canDelete": true,
        "isPrint": false,
        "isTooltip": false,
        "id": "",
        "fieldId": 0,
        "help": "",
        "fieldType": "signatureControl"
    };

    constructor() {
        this.settings = { ...Plugin.config.projectSettingsPage.defaultSettings, ...IC.getSettingJSON(Plugin.config.projectSettingsPage.settingName, {}) };
    }

    /** Add interactive element in this function */
    renderProjectPage() {

        const control = this.getDashboardDOM();
        app.itemForm.append(
            ml.UI.getPageTitle(
                "SIGN Overview",
                () => {
                    return control;
                },
                () => {
                    this.onResize();
                }
            )
        );

        this.installCopypaste(control);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        app.waitForMainTree(() => {
            this.render(control);

        });


        app.itemForm.append(control);
    }

    onResize() {
        /* Will be triggered when resizing. */
    }

    /** Customize static HTML here */
    private getDashboardDOM(): JQuery {
        return $(`
    <div class="panel-body-v-scroll fillHeight">
        <div class="panel-body selector">
            
        </div> 
        <div class="panel-body result">
        </div>
    </div>
    `);
    }

    private async loadNewSelection(newSelection: IReference[], resultDiv: JQuery<HTMLElement>) {
        resultDiv.empty();
        let spinningWait = ml.UI.getSpinningWait("Loading...")
        resultDiv.append(spinningWait);

        //Get the field ID of the signature field
        let fields = IC.getFieldsOfType("signature", "SIGN");
        let signatureField = undefined;
        if (fields.length == 1) {
            signatureField = fields[0].field.id;
        }
        let columns = this.settings.auditTrailColumns.split(",");

        if (newSelection.length == 0) {
            resultDiv.empty();
            resultDiv.append("No SIGN items found");
            return;
        }
        //Build MRQL Query
        let result: XRGetProject_Needle_TrimNeedle = <XRGetProject_Needle_TrimNeedle>await restConnection.getProject("needle?search=mrql:" + newSelection.map((item) => {
            if (item.to.indexOf("F-") == 0) {
                return "folderm=" + item.to;
            }
            return "id=" + item.to;

        }).join(" or ") + "&links=down&fieldsOut=*");

        if (result.needles.length == 0) {
            resultDiv.append("No SIGN items found");
            return;
        }

        let dhfFields = IC.getFieldsOfType("dhf", "DOC").map((o => o.field.id));

        let table = $("<table class='table table-bordered table-hover table-condensed'></table>");
        resultDiv.append(table);
        let thead = $("<thead></thead>").appendTo(table);
        let tr = $("<tr></tr>").appendTo(thead);
        tr.append("<th>DOC</th>");
        tr.append(`<th>${this.settings.auditTrailDisplayName}</th>`).css("width", "20%");
        tr.append("<th>SIGN item</th>").css("width", "20%");
        tr.append(`<th>${this.settings.signCreationDateDisplayName}</th>`);
        if( this.settings.showSignatures){
            tr.append("<th>Signature</th>");
        }
        let tbody = $("<tbody></tbody>").appendTo(table);
        for (let item of result.needles) {

            if (item.downLinkList == undefined || item.downLinkList.length == 0) {
                let auditTrailValue = this.getAuditTrailValue(item, dhfFields, columns);
                if( this.settings.showSignatures) {
                    $(`<tr><td>${ml.Item.parseRef(item.itemOrFolderRef).id}!</td><td>${auditTrailValue}</td><td></td><td></td><td></td></tr>`).appendTo(tbody);
                }
                else{
                     $(`<tr><td>${ml.Item.parseRef(item.itemOrFolderRef).id}!</td><td>${auditTrailValue}</td><td></td><td></td></tr>`).appendTo(tbody);

                }

                continue;
            }
            let signList = item?.downLinkList.map((link) => "id = " + ml.Item.parseRef(link.itemRef).id).join(" OR ");
            let mrql = "mrql: " + signList;
            let signResult: XRGetProject_Needle_TrimNeedle = <XRGetProject_Needle_TrimNeedle>await restConnection.getProject("needle?search=" + mrql + "&fieldsOut=" + signatureField);
            let signIndex = 0;
            for (let signItem of signResult.needles) {
                let tr = $("<tr></tr>").appendTo(tbody);
                if (signIndex == 0) {
                    $(`<td rowspan='${(item.downLinkList).length}'>${ml.Item.parseRef(item.itemOrFolderRef).id}!</td>`).css("width", "20%").appendTo(tr);
                    let auditTrailValue = this.getAuditTrailValue(item, dhfFields, columns);
                    $(`<td rowspan='${(item.downLinkList).length}'>${auditTrailValue}</td>`).css("width", "170px").appendTo(tr);

                }

                $("<td>" + (ml.Item.parseRef(signItem.itemOrFolderRef).id) + "!</td>").css("width", "30%").appendTo(tr);
                $("<td>" + ml.UI.DateTime.renderCustomerHumanDate(new Date(signItem.creationDate), false) + "</td>").css("width", "150px").appendTo(tr);

              if(this.settings.showSignatures === true){

                let signaturesControl = $("<div/>").css("width", "25%");
                let signatureTd = $("<td></td>").appendTo(tr);
                if ( signatureField != undefined && signItem.fieldVal[0] != undefined && signItem.fieldVal[0].value != undefined) {
                    let signOption = this.SIGNOption;
                    signOption.id = signItem.itemOrFolderRef;
                    signOption["fieldValue"] = "{}"; //  item.fieldVal[0].value;
                    signOption["fieldId"] = signatureField;
                    signOption["item"] = {};
                    signOption["item"]["signatureField"] = signItem.fieldVal[0].value;
                    signaturesControl.docSign(signOption);
                    // Convert the table into UL/LI
                    let ul = $("<ul/>").appendTo(signatureTd);
                    $("tr", $(".sigInfo table", signaturesControl)).each((i, item) => {
                        let li = $("<li/>").appendTo(ul);
                        li.append($("td:eq(0)", item).html());
                        li.append(" - ");
                        li.append($("td:eq(1)", item).html());
                    });
                }
              }
                signIndex++;
            }

        }


        resultDiv.highlightReferences();
        spinningWait.remove();
    }

    private render(control: JQuery) {


        let selector = $(".selector", control);
        let result = $(".result", control);
        const itemSelection = new ItemSelectionTools();
        let initialSelection = [];
        if (projectStorage.getItem("SIGN_OVERVIEW_SELECTION")) {
            initialSelection = JSON.parse(projectStorage.getItem("SIGN_OVERVIEW_SELECTION"));
            this.loadNewSelection(initialSelection, result);
        }
        itemSelection.renderButtons({
            getSelectedItems: () => {
                return initialSelection;
            },
            selectionChange: (newSelection) => {
                projectStorage.setItem("SIGN_OVERVIEW_SELECTION", JSON.stringify(newSelection));
                this.loadNewSelection(newSelection, result);

            },
            control: selector,
            buttonName: "Select DOC items",
            selectMode: SelectMode.autoPrecise,
            linkTypes: [{ type: "DOC" }]
        });
    }

    private installCopypaste(control: JQuery<HTMLElement>) {
        $("i", $(".toolbarButtons")).remove();

        $("<i class='fal fa-file-excel hideCopy' title='Copy to clipboard'></i>").appendTo($(".toolbarButtons")).click(() => {
            const exportToCSV = (text, fileName) => {
                const hiddenElement = document.createElement("a");
                const date = new Date();
                hiddenElement.href =
                    "data:xls/plain;charset=utf-8," + encodeURIComponent(text);
                hiddenElement.download = `${fileName}-${date.toISOString()}.xls`;
                hiddenElement.click();
            };
            exportToCSV($(".result table").parent().html(), "SIGN-overview");
        });

        ml.UI.copyBuffer(
            $(".toolbarButtons", app.itemForm),
            "copy  to clipboard",
            $(".result table"),
            $(".result table"),
            (copied: JQuery) => {
                copied.append($(".result").clone(false));

                $(".doNotCopy", copied).remove();
                // Different if popup/Control mode
                $("[data-attr='id']", copied).each((i, item) => {
                    $(item).text($(item).data("ref") + "!");
                });
            });
        $(".hideCopy", $(".toolbarButtons")).css({
            "margin-top": "4px",
            "margin-right": "15px"
        });

    }

    private getAuditTrailValue(item: XRTrimNeedleItem, dhfFields: number[], columns: string[]): string {
        let output = "";
        try {
            let auditTrailValue = item.fieldVal.find((field) => {
                let fieldValue = field.value;
                if (fieldValue != undefined && dhfFields.indexOf(field.id) != -1) {

                    let value = JSON.parse(fieldValue);
                    if (value.name == this.settings.auditTrailSectionName) {
                        return true;
                    }

                }
            });
            if (auditTrailValue != undefined && auditTrailValue.value != undefined) {
                // Let parse the audit trail value
                let auditTrailDHF = JSON.parse(auditTrailValue.value);
                let columnsMap = {};
                //Let find the col from ctrlConfig
                for (let col of auditTrailDHF.ctrlConfig.columns)
                    if (columns.indexOf(col.name) != -1) {
                        columnsMap[col.name] = col.field;
                    }
                let fieldValueArray = JSON.parse(auditTrailDHF.fieldValue);
                let lines = "";
                for (let fieldValue of fieldValueArray) {
                    let line =
                        Object.keys(columnsMap).map((col) => {
                            if (fieldValue[columnsMap[col]] != undefined) {
                                return fieldValue[columnsMap[col]];
                            }
                        }).join(" - ");
                    lines += line + "<br>";
                }
                output = lines;

            } else {
                output = "&nbsp;";
            }
        } catch (e) {
            output = "&nbsp;";
        }
        return output;
    }


}
