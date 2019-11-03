const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const remark = require("remark");
const badges = require("@thebespokepixel/badges");

/* …then read the 'badges.readme' stanza from package.json and send the AST into remark etc. */
badges('readme')
    .then(badges => {
        const content = { badges };
        const template = _.template(fs.readFileSync(path.join(__dirname, 'templates/README.md')));
        remark().process(template(content))
            .then(page => {
                fs.writeFileSync(path.join(__dirname, '..', 'README.md'), page, "utf8");
            });
    });
