import React from "react";
import { last, escapeRegExp, debounce } from "lodash";
import styled from "styled-components";

let BearStyle = styled.div`
  position: relative;
  white-space: pre-wrap;

  font-size: inherit;
  /* line-height: 24px; */

  & .pre {
    position: relative;
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;

    font-size: inherit;
    padding-left: 4px;
    padding-right: 4px;

    & span:not(.subtle) {
      /* Not sure why, but need this to show above the ::before */
      opacity: 0.9;
    }

    &::before {
      content: "";

      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;

      background-color: white;
      box-shadow: 0px 0px 0px 1px rgb(203, 203, 203) inset;
      border-radius: 2px;
    } 
  }

  .subtle {
    opacity: 0.5;
  }
  .subtle-effect-only {
    color: transparent;
    caret-color: #676a6c;
  }
  /* .subtle {
    color: rgb(181, 181, 181);
  } */

  .bear-underline {
    text-decoration: underline;
  }

  .header-1, .header-2, .header-3 {
    &:not(:first-child) {
      display: inline-block;
      margin-top: 6px;
    }

    .subtle {
      display: inline-block;
      margin-right: 4px;
      position: relative;
    }
    .subtle::before {
      content: "1";
      position: absolute;
      bottom: 0;
      right: -2px;
      font-size: 0.5em;
      line-height: normal;
    }
  }

  .header-1 {
    font-size: 1.2em;
    font-weight: bold;

    .subtle::before {
      content: "1";
    }
  }

  .header-2 {
    font-size: 1em;
    font-weight: bold;

    .subtle::before {
      content: "2";
    }
  }

  .header-3 {
    font-size: 1em;

    .subtle::before {
      content: "3";
    }
  }

  a {
    text-decoration: underline;
  }

  &:empty::after {
    content: "${p => p.placeholder}";
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }
`;

let get_text_nodes = element => {
  let text_nodes = [];
  let walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  while ((node = walker.nextNode())) {
    text_nodes.push(node);
  }
  return text_nodes;
};

function getCaretData(root_element, initial_position) {
  let nodes = get_text_nodes(root_element);
  let position = initial_position;

  for (let node of nodes) {
    if (position > node.nodeValue.length) {
      // remove amount from the position, go to next node
      position = position - node.nodeValue.length;
    } else {
      return {
        node: node,
        position: position
      };
    }
  }

  return { node: last(nodes), position: position };
}

// setting the caret with this info  is also standard
let setCaretPosition = d => {
  if (d.node == null) {
    return;
  }

  try {
    let sel = window.getSelection(),
      range = document.createRange();
    range.setStart(d.node, d.position);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (err) {
    console.log("err:", err);
  }
};

let defaultProps = {
  content: "",
  editable: true,
  multiline: false,
  tagName: "div",
  innerRef: () => {},
  onChange: () => {}
};

let regexp = (regexps, ...escapes) => {
  if (regexps.length === 1) {
    throw new Error("Bay");
  }

  let head = regexps.slice(0, 1)[0];
  let body = regexps.slice(1, -1);
  let tail = regexps.slice(-1)[0];

  let head_match = head.match(/^\s*\/(.*)/);
  if (!head_match) {
    throw new Error(`Wow`);
  }
  let tail_match = tail.match(/(.*)\/([g])\s*$/);
  if (!tail_match) {
    throw new Error(`Wow`);
  }

  head = head_match[1];
  tail = tail_match[1];
  let modifiers = tail_match[2];

  return new RegExp(
    `${head}${escapes
      .map((escapee, i) => `${escapeRegExp(escapee)}${body[i] || ""}`)
      .join("")}${tail}`,
    modifiers
  );
};

let markdown_style_boundaries = boundary => {
  let b = boundary;
  let regex = regexp`/(^| |[^a-zA-Z0-9:${b}]|\\n)${b}([^ ${b}](?:[^\n${b}]*[^ ${b}])?)${b}(?= |[^a-zA-Z0-9${b}]|$|\\n)/g`;
  return regex;
};

let url_regex = /( |^|\n)((?:http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+(?:[-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(?::[0-9]{1,5})?(?:\/.*)?)(?= |$|\n)/g;

let bearify = text => {
  // TODO Replace with /proper/ markdown-like bear (that keeps all characters for cursor consistent)
  let content = text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(url_regex, `$1<a href="$2">$2</a>`)
    .replace(
      markdown_style_boundaries("_"),
      // /_([^ _](?:[^_]*[^ _])?)_/g,
      '$1<span class="bear-underline"><span class="subtle-effect-only">_</span>$2<span class="subtle-effect-only">_</span></span>'
    )
    .replace(
      markdown_style_boundaries("/"),
      // /_([^ _](?:[^_]*[^ _])?)_/g,
      '$1<i><span class="subtle">/</span>$2<span class="subtle">/</span></i>'
    )
    .replace(
      markdown_style_boundaries("~"),
      // /\*([])([^ *](?:[^*]*[^ *])?)\*/g,
      '$1<del><span class="subtle-effect-only">~</span>$2<span class="subtle-effect-only">~</span></del>'
    )
    .replace(
      markdown_style_boundaries("-"),
      // /\*([])([^ *](?:[^*]*[^ *])?)\*/g,
      '$1<del><span class="subtle-effect-only">-</span>$2<span class="subtle-effect-only">-</span></del>'
    )
    .replace(
      markdown_style_boundaries("*"),
      // /\*([])([^ *](?:[^*]*[^ *])?)\*/g,
      '$1<b><span class="subtle">*</span>$2<span class="subtle">*</span></b>'
    )
    .replace(
      markdown_style_boundaries("`"),
      // /\*([])([^ *](?:[^*]*[^ *])?)\*/g,
      '$1<span class="pre"><span class="subtle">`</span><span>$2</span><span class="subtle">`</span></span>'
    )
    .replace(
      /(\n|^)# ([^\n]+)(?=\n|$)/g,
      '$1<span class="header-1"><span class="subtle">#</span> $2</span>'
    )
    .replace(
      /(\n|^)## ([^\n]+)(?=\n|$)/g,
      `$1<span class="header-2"><span class="subtle">#\u2060</span> $2</span>`
    )
    .replace(
      /(\n|^)### ([^\n]+)(?=\n|$)/g,
      `$1<span class="header-3"><span class="subtle">#\u2060\u2060</span> $2</span>`
    );
  // Zero width non breaking space: &#8288;
  // Also zero width non breaking space: &#65279;
  return content;
};

let get_current_carret_position = element => {
  let range = window.getSelection().getRangeAt(0);
  // TODO Check if range is even inside the editable element

  var preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  let end_offset = preCaretRange.toString().length;
  preCaretRange.setEnd(range.startContainer, range.startOffset);
  let start_offset = preCaretRange.toString().length;

  let text = element.innerText || "";

  return {
    end_offset,
    start_offset,
    text: {
      before: text.slice(0, start_offset),
      selected: text.slice(start_offset, end_offset),
      after: text.slice(end_offset)
    }
  };
};

class ContentEditable extends React.Component {
  next_cursor_position = null;
  just_did_redo = false;
  just_did_undo = false;
  _element = null;

  undo_stack = [];
  redo_stack = [];
  save_undo = debounce(
    ({ content, cursor_position }) => {
      console.log("cursor_position:", cursor_position);
      let last_stack = this.undo_stack[this.undo_stack.length - 1];
      if (last_stack == null || last_stack.content !== content) {
        this.undo_stack.push({ content, cursor_position });
      }
    },
    250,
    {
      leading: true,
      trailing: false
    }
  );

  getSnapshotBeforeUpdate(prevProps) {
    if (prevProps.content === this.props.content) {
      return null;
    }

    if (document.activeElement !== this._element) {
      return null;
    }

    if (this.next_cursor_position != null) {
      return this.next_cursor_position;
    } else {
      let { end_offset } = get_current_carret_position(this._element);
      return end_offset;
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.content !== this.props.content) {
      // console.log('Preparing new content with length', this.props.content.length);
      if (this.just_did_undo === true) {
        this.redo_stack.push({
          content: prevProps.content,
          cursor_position: this.previous_cursor_position
        });
        this.just_did_undo = false;
      } else {
        this.save_undo({
          content: prevProps.content,
          cursor_position: this.previous_cursor_position
        });

        if (this.just_did_redo === true) {
          this.just_did_redo = false;
        } else {
          this.redo_stack = [];
        }
      }
    }

    if (snapshot != null) {
      var data = getCaretData(this._element, snapshot);
      this.previous_cursor_position = snapshot;
      this.next_cursor_position = null;
      setCaretPosition(data);
    }
  }

  sanitiseValue(val) {
    let value = val.replace(/\u{2060}/gu, "#");
    return value;
  }

  onPaste = event => {
    event.preventDefault();

    let clipboardData = event.clipboardData || window.clipboardData;
    let pastedData = clipboardData.getData("Text");

    let {
      text: { before, selected, after }
    } = get_current_carret_position(this._element);
    this.onChange(`${before}${pastedData}${after}`);
  };

  onChange(raw_value) {
    let value = this.sanitiseValue(raw_value);
    this.props.onChange(value);
  }

  _onKeyDown = ev => {
    let { multiline } = this.props;

    let is_meta = ev.metaKey || ev.ctrlKey;

    // Cmd + z for undo
    if (is_meta && ev.key === "z") {
      if (ev.shiftKey) {
        let { content, cursor_position } = this.redo_stack.pop();
        if (content != null) {
          this.just_did_redo = true;
          this.next_cursor_position = cursor_position;
          this.onChange(content);
        }
      } else {
        let { content, cursor_position } = this.undo_stack.pop();
        if (content != null) {
          this.just_did_undo = true;
          this.next_cursor_position = cursor_position;
          this.onChange(content);
        }
      }

      return;
    }

    // Cmd + b for Bold
    if (is_meta && ev.key === "b") {
      let {
        text: { before, selected, after },
        end_offset
      } = get_current_carret_position(this._element);
      let value = `${before}*${selected}*${after}`;

      this.onChange(value);

      this.next_cursor_position = end_offset + 2;
      return;
    }

    // Cmd + i for Italic
    if (is_meta && ev.key === "i") {
      let {
        text: { before, selected, after },
        end_offset
      } = get_current_carret_position(this._element);
      let value = `${before}/${selected}/${after}`;

      this.onChange(value);
      this.next_cursor_position = end_offset + 2;
      return;
    }

    // Cmd + u for Underline
    if (is_meta && ev.key === "u") {
      let {
        text: { before, selected, after },
        end_offset
      } = get_current_carret_position(this._element);
      let value = `${before}_${selected}_${after}`;

      this.onChange(value);
      this.next_cursor_position = end_offset + 2;
      return;
    }

    if (ev.which === 13) {
      if (multiline === true) {
        if (ev.shiftKey === false) {
          ev.preventDefault();

          let {
            text: { before, selected, after },
            end_offset
          } = get_current_carret_position(this._element);

          let value = `${before}\n${after === "" ? "\n" : after}`;

          this.next_cursor_position = end_offset + 1;
          this.onChange(value);
        }
      } else {
        ev.preventDefault();
        ev.currentTarget.blur();
      }
      return;
    }
  };

  render() {
    let {
      innerRef,
      content,
      editable,
      style,
      multiline,
      ...props
    } = this.props;

    let html = bearify(content);

    return (
      <BearStyle
        {...props}
        ref={ref => {
          this._element = ref;
          innerRef(ref);
        }}
        style={{ ...style }}
        contentEditable={editable}
        dangerouslySetInnerHTML={{ __html: html }}
        onInput={ev => this.onChange(this._element.innerText)}
        onKeyDown={this._onKeyDown}
        onPaste={this.onPaste}
      />
    );
  }
}

ContentEditable.defaultProps = defaultProps;

export default ContentEditable;
