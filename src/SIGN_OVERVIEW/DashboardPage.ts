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
        "parameter": { "readonly": false, "inlineHelp":"" },
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
    0;

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
        app.waitForMainTree(()=>{
            this.render(control);

        })


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
        resultDiv.append(ml.UI.getSpinningWait("Loading..."));

        //Get the field ID of the signature field
        let fields = IC.getFieldsOfType("signature", "SIGN");
        let signatureField = undefined;
        if (fields.length == 1) {
            signatureField = fields[0].field.id;
        }

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

        }).join(" or ") + "&links=up&fieldsOut=" + signatureField);
        resultDiv.empty();

        if (result.needles.length == 0) {
            resultDiv.append("No SIGN items found");
            return;
        }

        let table = $("<table class='table table-bordered table-hover table-condensed'></table>");
        resultDiv.append(table);
        let thead = $("<thead></thead>").appendTo(table);
        let tr = $("<tr></tr>").appendTo(thead);
        tr.append("<th>DOC</th>")
        tr.append("<th>SIGN item</th>").css("width", "20%");
        tr.append("<th>SIGN Creation date</th>");
        tr.append("<th>Signature</th>");
        let tbody = $("<tbody></tbody>").appendTo(table);
        for (let item of result.needles) {
            let tr = $("<tr></tr>").appendTo(tbody);
           $("<td>" + item.upLinkList.filter(o => o.itemRef.indexOf("DOC-") == 0).map(o => (ml.Item.parseRef(o.itemRef).id) + "!").join(("<br>")) + "</td>").css("width", "30%").appendTo(tr);
           $("<td>" +  (ml.Item.parseRef(item.itemOrFolderRef).id) + "!</td>").css("width", "30%").appendTo(tr);
           $("<td>" + ml.UI.DateTime.renderCustomerHumanDate(  new Date(item.creationDate) ,false ) +  "</td>").css("width", "15%").appendTo(tr);
            let signaturesControl = $("<div/>").css("width","25%");
            let signatureTd = $("<td></td>").appendTo(tr);
            if (signatureField != undefined &&  item.fieldVal[0] != undefined && item.fieldVal[0].value != undefined) {
                let signOption = this.SIGNOption;
                signOption.id = item.itemOrFolderRef;
                signOption["fieldValue"] = "{}" ; //  item.fieldVal[0].value;
                signOption["fieldId"] = signatureField;
                signOption["item"]= {};
                signOption["item"]["signatureField"] =  item.fieldVal[0].value ;
                signaturesControl.docSign(signOption);
                // Convert the table into UL/LI
                let ul = $("<ul/>").appendTo(signatureTd);
                $("tr", $(".sigInfo table",signaturesControl)).each((i, item) => {
                    let li = $("<li/>").appendTo(ul);
                    li.append($("td:eq(0)", item).html());
                    li.append(" - ");
                    li.append($("td:eq(1)", item).html());
                });


            }
        }

        table.tablesorter({ sortList: [[0, 0], [1,0]] });

        resultDiv.highlightReferences();
    }

    private render(control:JQuery) {


        let panelBody = control.find(".panel-body");
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
            buttonName: "Select SIGN items",
            selectMode: SelectMode.autoPrecise,
            linkTypes: [{ type: "SIGN" }]
        });
    }

    private installCopypaste(control: JQuery<HTMLElement>) {
        $('i', $('.toolbarButtons')).remove();
        ml.UI.copyBuffer(
            $('.toolbarButtons', app.itemForm),
            'copy  to clipboard',
            $('.result table'),
            $('.result table'),
            (copied: JQuery) => {
                copied.append($('.result').clone(false));

                $('.doNotCopy', copied).remove();
                // Different if popup/Control mode
                $("[data-attr='id']", copied).each((i, item) => {
                    $(item).text($(item).data('ref') + '!');
                });
            });
        $('.hideCopy', $('.toolbarButtons')).css({
            'margin-top': '4px',
            'margin-right': '15px',
        });

    }

}
