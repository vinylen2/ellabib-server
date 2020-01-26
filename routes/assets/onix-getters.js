const onixGetters = {
  getResourceLink(feed) {
    return feed.products[0].collateralDetail.supportingResource
    .find(element => element.resourceContentType == 1)
    .resourceVersion[0].resourceLink;
  },
  getPages(feed) {
    return feed.products[0].descriptiveDetail.extent
      .find(element => element.type == 00)
      .value;
  },
  getTitle(feed) {
    return feed.products[0].descriptiveDetail.titleDetail
      .find(element => element.type == 01)
      .element.text;
  },
  getDescription(feed) {
    return feed.products[0].collateralDetail.textContent
      .find(element => element.type == 3)
      .text;
  },
  getAuthorFirstname(feed) {
    return feed.products[0].descriptiveDetail.contributor
      .find(element => element.sequenceNumber == 1)
      .firstname
  },
  getAuthorLastname(feed) {
    return feed.products[0].descriptiveDetail.contributor
      .find(element => element.sequenceNumber == 1)
      .lastname
  }
};

module.exports = onixGetters;
