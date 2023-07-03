package com.appian.richtext.templates;

import com.appian.connectedsystems.simplified.sdk.SimpleConnectedSystemTemplate;
import com.appian.connectedsystems.simplified.sdk.configuration.SimpleConfiguration;
import com.appian.connectedsystems.templateframework.sdk.ExecutionContext;
import com.appian.connectedsystems.templateframework.sdk.TemplateId;

import java.util.Locale;
import java.util.ResourceBundle;

@TemplateId(name = "RichTextCSP")
public class RichTextCSP extends SimpleConnectedSystemTemplate {
  public static final String UPLOAD_FOLDER_UUID_PROP = "uploadFolderUuid";
  public static final String UPLOAD_IMAGE_AS_PROP = "uploadImageAs";

  @Override
  protected SimpleConfiguration getConfiguration(
    SimpleConfiguration simpleConfiguration, ExecutionContext executionContext) {
    Locale designerLocale = executionContext.getDesignerLocale();
    ResourceBundle resources = ResourceBundle.getBundle("resources", designerLocale);
    return simpleConfiguration.setProperties(
      textProperty(UPLOAD_FOLDER_UUID_PROP)
        .label(resources.getString("RichTextCSP.uploadFolder.label"))
        .instructionText(resources.getString("RichTextCSP.uploadFolder.instructions"))
        .isRequired(true)
        .isImportCustomizable(true)
        .build(),
      textProperty(UPLOAD_IMAGE_AS_PROP)
        .label(resources.getString("RichTextCSP.uploadAs.label"))
        .instructionText(resources.getString("RichTextCSP.uploadAs.instructions"))
        .isRequired(true)
        .isImportCustomizable(true)
        .build());
  }
}
