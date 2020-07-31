package com.appian.richtext.templates;

import com.appian.connectedsystems.simplified.sdk.SimpleConnectedSystemTemplate;
import com.appian.connectedsystems.simplified.sdk.configuration.SimpleConfiguration;
import com.appian.connectedsystems.templateframework.sdk.ExecutionContext;
import com.appian.connectedsystems.templateframework.sdk.TemplateId;

@TemplateId(name="RichTextCSP")
public class RichTextCSP extends SimpleConnectedSystemTemplate {
  @Override
  protected SimpleConfiguration getConfiguration(
      SimpleConfiguration simpleConfiguration, ExecutionContext executionContext) {
    return simpleConfiguration.setProperties();
  }
}
