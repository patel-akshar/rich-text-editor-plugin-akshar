package com.appian.richtext.templates;

import com.appian.connectedsystems.simplified.sdk.SimpleClientApi;
import com.appian.connectedsystems.simplified.sdk.SimpleClientApiRequest;
import com.appian.connectedsystems.templateframework.sdk.ClientApiResponse;
import com.appian.connectedsystems.templateframework.sdk.ExecutionContext;
import com.appian.connectedsystems.templateframework.sdk.TemplateId;
import com.appiancorp.services.ServiceContext;
import com.appiancorp.services.ServiceContextFactory;
import com.appiancorp.suiteapi.common.ServiceLocator;
import com.appiancorp.suiteapi.content.Content;
import com.appiancorp.suiteapi.content.ContentConstants;
import com.appiancorp.suiteapi.content.ContentOutputStream;
import com.appiancorp.suiteapi.content.ContentService;
import com.appiancorp.suiteapi.knowledge.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import static com.appian.richtext.templates.RichTextCSP.UPLOAD_FOLDER_UUID_PROP;
import static com.appian.richtext.templates.RichTextCSP.UPLOAD_IMAGE_AS_PROP;

@TemplateId(name = "ImageStorageClientApi")
public class ImageStorageClientApi extends SimpleClientApi {

  Logger logger = LoggerFactory.getLogger(ImageStorageClientApi.class);

  @Override
  protected ClientApiResponse execute(
    SimpleClientApiRequest simpleClientApiRequest, ExecutionContext executionContext) {

    Map<String, Object> resultMap = new HashMap<>();

    String uploadFolderUuid = simpleClientApiRequest.getConnectedSystemConfiguration().getValue(UPLOAD_FOLDER_UUID_PROP);
    String uploadImageAsUser = simpleClientApiRequest.getConnectedSystemConfiguration().getValue(UPLOAD_IMAGE_AS_PROP);

    // Obtain the values from the request sent from the rich text editor.
    String imageData;

    try {
      imageData = (String) simpleClientApiRequest.getPayload().get("base64");
    } catch (Exception e) {
      logger.error("Unable to get data from client", e);
      resultMap.put("error", e.getLocalizedMessage());
      return new ClientApiResponse(resultMap);
    }

    // Convert base64 to a buffered image.
    String base64String = imageData.split(",")[1];
    String extension = imageData.substring("data:image/".length(), imageData.indexOf(";base64"));
    byte[] imageBytes = Base64.getDecoder().decode(base64String);

    // Create an Appian document.
    // I know this is deprecated, but the dependency injection strategy only works for
    // smart services and expression functions.
    // Reference:
    // https://community.appian.com/discussions/f/plug-ins/12745/contentservice-dependency-injection-not-working
    ServiceContext uploadImageUserCtx = ServiceContextFactory.getServiceContext(uploadImageAsUser);
    ContentService cs = ServiceLocator.getContentService(uploadImageUserCtx);
    long uploadFolder = cs.getIdByUuid(uploadFolderUuid);

    Document doc = new Document();
    doc.setName("Rich Text Editor Uploaded Image");
    doc.setExtension(extension);
    doc.setParent(uploadFolder);

    Long newImageId;
    String newImageUrl;

    try (ContentOutputStream cos = cs.upload(doc, ContentConstants.UNIQUE_NONE)) {
      cos.write(imageBytes);
      newImageId = cos.getContentId();
    } catch (Exception e) {
      logger.error("Error uploading doc", e);
      resultMap.put("error", e.getLocalizedMessage());
      return new ClientApiResponse(resultMap);
    }

    // Rename the file to include the docId and then get the URL
    try {
      Content content = cs.getVersion(newImageId, ContentConstants.VERSION_CURRENT);
      content.setName(content.getName() + " " + newImageId);
      Integer[] columnsToUpdate = new Integer[] { ContentConstants.COLUMN_NAME };
      cs.updateFields(content, columnsToUpdate, ContentConstants.UNIQUE_NONE);
      newImageUrl = cs.getContentUrl(newImageId);
    } catch (Exception e) {
      logger.error("Error changing doc name", e);
      resultMap.put("error", e.getLocalizedMessage());
      return new ClientApiResponse(resultMap);
    }

    // Return the document URL back to the Rich Text Editor.
    logger.info("Returning new docUrl to client:" + newImageUrl);
    resultMap.put("docURL", newImageUrl);
    resultMap.put("docID", newImageId);

    return new ClientApiResponse(resultMap);
  }
}
