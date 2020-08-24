package com.appian.richtext.templates;

import com.appian.connectedsystems.simplified.sdk.SimpleConnectedSystemTemplate;
import com.appian.connectedsystems.simplified.sdk.configuration.SimpleConfiguration;
import com.appian.connectedsystems.templateframework.sdk.ExecutionContext;
import com.appian.connectedsystems.templateframework.sdk.TemplateId;

@TemplateId(name="RichTextCSP")
public class RichTextCSP extends SimpleConnectedSystemTemplate {
  public static final String UPLOAD_FOLDER_UUID_PROP = "uploadFolderUuid";
  public static final String UPLOAD_IMAGE_AS_PROP = "uploadImageAs";

  @Override
  protected SimpleConfiguration getConfiguration(
      SimpleConfiguration simpleConfiguration, ExecutionContext executionContext) {
    return simpleConfiguration.setProperties(
            textProperty(UPLOAD_FOLDER_UUID_PROP)
                    .label("Upload Folder UUID")
                    .instructionText("Images uploaded to the Rich Text Editor will be uploaded to this folder")
                    .isRequired(true)
                    .build(),
            textProperty(UPLOAD_IMAGE_AS_PROP)
                    .label("Upload Images as User")
                    .instructionText("Images uploaded to the Rich Text Editor will be shown as created by this user")
                    .isRequired(true)
                    .build());
  }
}
