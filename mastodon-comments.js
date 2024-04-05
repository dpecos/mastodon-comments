const styles = `
:root {
  --font-color: #5d686f;
  --font-size: 1.0rem;

  --block-border-width: 1px;
  --block-border-radius: 3px;
  --block-border-color: #ededf0;
  --block-background-color: #f7f8f8;

  --comment-indent: 40px;
}

#mastodon-stats {
  text-align: center;
  font-size: calc(var(--font-size) * 2)
}

#mastodon-comments-list {
  margin: 0 auto;
}

.mastodon-comment {
  background-color: var(--block-background-color);
  border-radius: var(--block-border-radius);
  border: var(--block-border-width) var(--block-border-color) solid;
  padding: 20px;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  color: var(--font-color);
  font-size: var(--font-size);
}

.mastodon-comment p {
  margin-bottom: 0px;
}

.mastodon-comment .author {
  padding-top:0;
  display:flex;
}

.mastodon-comment .author a {
  text-decoration: none;
}

.mastodon-comment .author .avatar img {
  margin-right:1rem;
  min-width:60px;
  border-radius: 5px;
}

.mastodon-comment .author .details {
  display: flex;
  flex-direction: column;
}

.mastodon-comment .author .details .name {
  font-weight: bold;
}

.mastodon-comment .author .details .user {
  color: #5d686f;
  font-size: medium;
}

.mastodon-comment .author .date {
  margin-left: auto;
  font-size: small;
}

.mastodon-comment .content {
  margin: 15px 20px;
}

.mastodon-comment .attachments {
  margin: 0px 10px;
}

.mastodon-comment .attachments > * {
  margin: 0px 10px;
}

.mastodon-comment .attachments img {
  max-width: 100%;
}

.mastodon-comment .content p:first-child {
  margin-top:0;
  margin-bottom:0;
}

.mastodon-comment .status > div, #mastodon-stats > div {
  display: inline-block;
  margin-right: 15px;
}

.mastodon-comment .status a, #mastodon-stats a {
  color: #5d686f;
  text-decoration: none;
}

.mastodon-comment .status .replies.active a, #mastodon-stats .replies.active a {
  color: #003eaa;
}

.mastodon-comment .status .reblogs.active a, #mastodon-stats .reblogs.active a {
  color: #8c8dff;
}

.mastodon-comment .status .favourites.active a, #mastodon-stats .favourites.active a {
  color: #ca8f04;
}
`;

class MastodonComments extends HTMLElement {
  constructor() {
    super();

    this.host = this.getAttribute("host");
    this.user = this.getAttribute("user");
    this.tootId = this.getAttribute("tootId");

    this.commentsLoaded = false;

    const styleElem = document.createElement("style");
    styleElem.innerHTML = styles;
    document.head.appendChild(styleElem);
  }

  connectedCallback() {
    this.innerHTML = `
      <div id="mastodon-stats"></div>
      <h2>Comments</h2>

      <noscript>
        <div id="error">
          Please enable JavaScript to view the comments powered by the Fediverse.
        </div>
      </noscript>

      <p>You can use your Fediverse (i.e. Mastodon, among many others) account to reply to this <a class="link"
          href="https://${this.host}/@${this.user}/${this.tootId}">post</a>.
      </p>
      <p id="mastodon-comments-list"></p>
    `;

    const comments = document.getElementById("mastodon-comments-list");
    const rootStyle = this.getAttribute("style");
    if (rootStyle) {
      comments.setAttribute("style", rootStyle);
    }
    this.respondToVisibility(comments, this.loadComments.bind(this));
  }

  escapeHtml(unsafe) {
    return (unsafe || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  toot_active(toot, what) {
    var count = toot[what + "_count"];
    return count > 0 ? "active" : "";
  }

  toot_count(toot, what) {
    var count = toot[what + "_count"];
    return count > 0 ? count : "";
  }

  toot_stats(toot) {
    return `
      <div class="replies ${this.toot_active(toot, "replies")}">
        <a href="${
          toot.url
        }" rel="nofollow"><i class="fa fa-reply fa-fw"></i>${this.toot_count(
          toot,
          "replies",
        )}</a>
      </div>
      <div class="reblogs ${this.toot_active(toot, "reblogs")}">
        <a href="${
          toot.url
        }" rel="nofollow"><i class="fa fa-retweet fa-fw"></i>${this.toot_count(
          toot,
          "reblogs",
        )}</a>
      </div>
      <div class="favourites ${this.toot_active(toot, "favourites")}">
        <a href="${
          toot.url
        }" rel="nofollow"><i class="fa fa-star fa-fw"></i>${this.toot_count(
          toot,
          "favourites",
        )}</a>
      </div>
    `;
  }

  user_account(account) {
    var result = `@${account.acct}`;
    if (account.acct.indexOf("@") === -1) {
      var domain = new URL(account.url);
      result += `@${domain.hostname}`;
    }
    return result;
  }

  render_toots(toots, in_reply_to, depth) {
    var tootsToRender = toots
      .filter((toot) => toot.in_reply_to_id === in_reply_to)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    tootsToRender.forEach((toot) => this.render_toot(toots, toot, depth));
  }

  render_toot(toots, toot, depth) {
    toot.account.display_name = this.escapeHtml(toot.account.display_name);
    toot.account.emojis.forEach((emoji) => {
      toot.account.display_name = toot.account.display_name.replace(
        `:${emoji.shortcode}:`,
        `<img src="${this.escapeHtml(emoji.static_url)}" alt="Emoji ${
          emoji.shortcode
        }" height="20" width="20" />`,
      );
    });

    const mastodonComment = `<div class="mastodon-comment" style="margin-left: calc(var(--comment-indent) * ${depth})">
        <div class="author">
          <div class="avatar">
            <img src="${this.escapeHtml(
              toot.account.avatar_static,
            )}" height=60 width=60 alt="">
          </div>
          <div class="details">
            <a class="name" href="${toot.account.url}" rel="nofollow">${
              toot.account.display_name
            }</a>
            <a class="user" href="${
              toot.account.url
            }" rel="nofollow">${this.user_account(toot.account)}</a>
          </div>
          <a class="date" href="${
            toot.url
          }" rel="nofollow">${toot.created_at.substr(
            0,
            10,
          )} ${toot.created_at.substr(11, 8)}</a>
        </div>
        <div class="content">${toot.content}</div>
        <div class="attachments">
          ${toot.media_attachments
            .map((attachment) => {
              if (attachment.type === "image") {
                return `<a href="${attachment.url}" rel="nofollow"><img src="${
                  attachment.preview_url
                }" alt="${this.escapeHtml(attachment.description)}" /></a>`;
              } else if (attachment.type === "video") {
                return `<video controls><source src="${attachment.url}" type="${attachment.mime_type}"></video>`;
              } else if (attachment.type === "gifv") {
                return `<video autoplay loop muted playsinline><source src="${attachment.url}" type="${attachment.mime_type}"></video>`;
              } else if (attachment.type === "audio") {
                return `<audio controls><source src="${attachment.url}" type="${attachment.mime_type}"></audio>`;
              } else {
                return `<a href="${attachment.url}" rel="nofollow">${attachment.type}</a>`;
              }
            })
            .join("")}
        </div>
        <div class="status">
          ${this.toot_stats(toot)}
        </div>
      </div>`;

    var div = document.createElement("div");
    div.innerHTML =
      typeof DOMPurify !== "undefined"
        ? DOMPurify.sanitize(mastodonComment.trim())
        : mastodonComment.trim();
    document
      .getElementById("mastodon-comments-list")
      .appendChild(div.firstChild);

    this.render_toots(toots, toot.id, depth + 1);
  }

  loadComments() {
    if (this.commentsLoaded) return;

    document.getElementById("mastodon-comments-list").innerHTML =
      "Loading comments from the Fediverse...";

    let _this = this;

    fetch("https://" + this.host + "/api/v1/statuses/" + this.tootId)
      .then((response) => response.json())
      .then((toot) => {
        document.getElementById("mastodon-stats").innerHTML =
          this.toot_stats(toot);
      });

    fetch(
      "https://" + this.host + "/api/v1/statuses/" + this.tootId + "/context",
    )
      .then((response) => response.json())
      .then((data) => {
        if (
          data["descendants"] &&
          Array.isArray(data["descendants"]) &&
          data["descendants"].length > 0
        ) {
          document.getElementById("mastodon-comments-list").innerHTML = "";
          _this.render_toots(data["descendants"], _this.tootId, 0);
        } else {
          document.getElementById("mastodon-comments-list").innerHTML =
            "<p>No comments found</p>";
        }

        _this.commentsLoaded = true;
      });
  }

  respondToVisibility(element, callback) {
    var options = {
      root: null,
    };

    var observer = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio > 0) {
          callback();
        }
      });
    }, options);

    observer.observe(element);
  }
}

customElements.define("mastodon-comments", MastodonComments);
