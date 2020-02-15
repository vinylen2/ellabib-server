const _ = require('lodash');
const onixGetters = {
  getResourceLink(feed) {
    console.log(feed.products[0].collateralDetail.supportingResource);
    return feed.products[0].collateralDetail.supportingResource
    .find(element => (element.resourceContentType == 1 || element.resourceContentType === '01_03'))
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
    let text = feed.products[0].collateralDetail.textContent
      .find(element => (element.type == 3 || element.type == 2))
      .text;
    
    return _.unescape(text).replace(/(<([^>]+)>)/ig,"");
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
