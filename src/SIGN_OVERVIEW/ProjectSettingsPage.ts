import { IPluginSettingPage } from "./core/PluginCore";
import { IProjectSettings } from "./Interfaces";
import { Plugin } from "./Main";

    /* project Setting page closure*/
    export function ProjectSettingsPage():IPluginSettingPage <IProjectSettings>{
        let self: IPluginSettingPage<IProjectSettings> = {};

        if (window["ConfigPage"] !== undefined) {
            self = { ...Object.getPrototypeOf(new ConfigPage()) }
        }

        
        self.getSettingsDOM = (settings:IProjectSettings): JQuery => {
            
            return $(`
                <div class="panel-body-v-scroll fillHeight">
                    <div id="controls"></div>
                </div>
                `);
        };


        self.settings = () => {
            let currentSettings = {};
            if (window["configApp"] !=undefined) {
                let filterSettings = configApp.getJSONProjectSettings(self.getProject(), Plugin.config.projectSettingsPage.settingName);
                if (filterSettings.length == 1)
                    currentSettings = filterSettings[0].value;
            }
            else {
                currentSettings = IC.getSettingJSON(Plugin.config.projectSettingsPage.settingName, {});
            }
            console.log("Returning project settings");
            return { ...Plugin.config.projectSettingsPage.defaultSettings, ...currentSettings }
        };
        self.renderSettingPage = () => {
            self.initPage(
                `${ Plugin.config.projectSettingsPage.title}` ,
                true,
                undefined,
                Plugin.config.projectSettingsPage.help,
                Plugin.config.projectSettingsPage.helpUrl,
                undefined
            );
            self.showSimple();
        };
        self.saveAsync = ()=> {
            let def =  configApp.setProjectSettingAsync(self.getProject(), Plugin.config.projectSettingsPage.settingName, JSON.stringify(self.settingsChanged), configApp.getCurrentItemId());
            def.done(() => {
                self.settingsOriginal = { ...self.settingsChanged };
                self.renderSettingPage();
            })
            return def;
        }
        self.getProject = () => {
            /* get the project id from the setting page */
            return configApp.getCurrentItemId().split("-")[0];
        }
        self.showAdvanced = () => {
            console.debug("Show advanced clicked");
            self.showAdvancedCode(JSON.stringify(self.settingsChanged), function (newCode: string) {
                self.settingsChanged = JSON.parse(newCode);
                self.paramChanged();
               
            });
        };
        self.showSimple = () => {

            self.settingsOriginal = self.settings();
            self.settingsChanged = { ...self.settingsOriginal };
            let dom = self.getSettingsDOM(self.settingsChanged);
            ml.UI.addCheckbox($("#controls",dom), "Enabled", self.settingsChanged, "enabled", self.paramChanged) ;
            $("#controls",dom).append("<hr>");
            ml.UI.addTextInput($("#controls",dom), "Audit trail section name", self.settingsChanged, "auditTrailSectionName",self.paramChanged);
            ml.UI.addTextInput($("#controls",dom), "Audit trail Columns to display <br> (comma separated)", self.settingsChanged, "auditTrailColumns",self.paramChanged);
            $("#controls",dom).append("<hr>");
            ml.UI.addTextInput($("#controls",dom), "Column title for Audit trail", self.settingsChanged, "auditTrailDisplayName",self.paramChanged);
            ml.UI.addTextInput($("#controls",dom), "Column title for Sign Creation Date", self.settingsChanged, "signCreationDateDisplayName",self.paramChanged);
            ml.UI.addCheckbox($("#controls",dom), "Show Signatures column", self.settingsChanged, "showSignatures", self.paramChanged) ;

            app.itemForm.append(dom);
        };

        self.paramChanged = () => {
            configApp.itemChanged(JSON.stringify(self.settingsOriginal) != JSON.stringify(self.settingsChanged));
        }
        return self;
    }
