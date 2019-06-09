import React, { useEffect } from "react";
import { last, escapeRegExp, debounce } from "lodash";
import styled from "styled-components";

let BearStyle = styled.div`
  position: relative;
  white-space: pre-wrap;

  font-size: inherit;
  z-index: 0;
  line-height: 1.3em;
  /* line-height: 24px; */

  & .pre {
    position: relative;
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;

    font-size: inherit;
    padding-left: 4px;
    padding-right: 4px;

    & span:not(.subtle) {
      /* Not sure why, but need this to show above the ::before */
      /* opacity: 0.9; */
    }

    &::before {
      content: "";
      z-index: -1;

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

  .bear-list-margin {
    letter-spacing: 5px;
  }
  .bear-list-circle {
    color: transparent;
    caret-color: black;
    letter-spacing: 5px;

    position: relative;
    &::before {
      content: "•";
      position: absolute;
      right: 5px;

      font-size: 1.2em;
      color: rgba(200, 0, 0, .8);
    }
  }
  .bear-list-number {
    color: rgba(200, 0, 0, .8);
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
    display: inline-block;
    &:not(:last-child) {
      margin-bottom: 10px;
    }
    &:not(:first-child) {
      margin-top: 5px;
    }

    .subtle-header {
      display: inline-block;
      margin-right: 4px;
      position: relative;
    }
    .subtle-header::before {
      content: "1";
      position: absolute;
      bottom: 0;
      right: -4px;
      font-size: 0.5em;
      line-height: normal;
    }
  }

  .header-1 {
    font-size: 1.4em;
    font-weight: bold;

    .subtle::before {
      content: "1";
    }
  }

  .header-2 {
    font-size: 1.2em;
    font-weight: bold;

    .subtle::before {
      content: "2";
    }
  }

  .header-3 {
    font-weight: bold;

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

function getCaretData(root_element, start, end) {
  let nodes = get_text_nodes(root_element);
  let position = 0;

  let start_result = null;
  let end_result = null;

  for (let node of nodes) {
    if (start_result == null) {
      if (position + node.nodeValue.length > start) {
        // remove amount from the position, go to next node
        start_result = { node: node, offset: start - position };
      }
    }
    if (end_result == null) {
      if (position + node.nodeValue.length > end) {
        // remove amount from the position, go to next node
        end_result = { node: node, offset: end - position };
      }
    }

    if (start_result != null && end_result != null) {
      return {
        start: start_result,
        end: end_result
      };
    }

    position = position + node.nodeValue.length;
  }

  return {
    start: start_result || { node: last(nodes), position: position },
    end: end_result || { node: last(nodes), position: position }
  };
}

// setting the caret with this info  is also standard
let setCaretPosition = d => {
  try {
    let sel = window.getSelection();
    let range = document.createRange();
    range.setStart(d.start.node, d.start.offset);
    range.setEnd(d.end.node, d.end.offset);
    // range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (err) {
    console.log("err:", err);
  }
};

let defaultProps = {
  content: "",
  editable: true,
  multiline: true,
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
let unordered_list_regex = /(?<=^|\n)((?: {2})*)\* ([^\n]*)(?=$|\n)/g;
let ordered_list_regex = /(?<=^|\n)((?: {2})*)(\d+)\. ([^\n]*)(?=$|\n)/g;

let bearify = (text, is_meta = false) => {
  // TODO Replace with /proper/ markdown-like bear (that keeps all characters for cursor consistent)
  let content = text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      url_regex,
      `$1<a target="_blank" contenteditable="${
        is_meta ? "false" : "true"
      }" href="$2" title="⌘/ctrl + click to open">$2</a>`
    )
    .replace(
      unordered_list_regex,
      `<span class="bear-list-margin">$1</span><span class="bear-list-circle">* </span><span>$2</span>`
    )
    .replace(
      ordered_list_regex,
      `<span class="bear-list-margin">$1</span><span class="bear-list-number">$2</span><span class="subtle">. </span><span>$3</span>`
    )
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
      '$1<span class="header-1"><span class="subtle subtle-header">#</span> $2</span>'
    )
    .replace(
      /(\n|^)## ([^\n]+)(?=\n|$)/g,
      `$1<span class="header-2"><span class="subtle subtle-header">#\u2060</span> $2</span>`
    )
    .replace(
      /(\n|^)### ([^\n]+)(?=\n|$)/g,
      `$1<span class="header-3"><span class="subtle subtle-header">#\u2060\u2060</span> $2</span>`
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
    position: {
      end: end_offset,
      start: start_offset
    },
    text: {
      before: text.slice(0, start_offset),
      selected: text.slice(start_offset, end_offset),
      after: text.slice(end_offset)
    }
  };
};

let useEvent = ({ target, name, onEvent, passive, capture }) => {
  useEffect(() => {
    target.addEventListener(name, onEvent, { capture, passive });

    return () => {
      target.removeEventListener(name, onEvent);
    };
  });
};

let Keyboard = ({ onMetaChange }) => {
  useEvent({
    target: document,
    name: "keydown",
    onEvent: event => {
      let is_meta = event.metaKey || event.ctrlKey;
      if (is_meta) {
        onMetaChange(true);
      }
    }
  });
  useEvent({
    target: document,
    name: "keyup",
    onEvent: event => {
      let is_meta = event.metaKey || event.ctrlKey;
      if (!is_meta) {
        onMetaChange(false);
      }
    }
  });

  // let handler = event => {
  //   console.log("event:", event);
  // };
  // let anchors = scope_ref.querySelectorAll("a");
  // for (let anchor of anchors) {
  //   anchor.addEventListener("click", handler);
  // }

  // return () => {
  //   for (let anchor of anchors) {
  //     anchor.removeEventListener("click", handler);
  //   }
  // };

  return null;
};

class ContentEditable extends React.Component {
  state = {
    meta_active: false
  };

  next_cursor_position = null;
  just_did_redo = false;
  just_did_undo = false;
  _element = null;

  undo_stack = [];
  redo_stack = [];
  save_undo = debounce(
    ({ content, cursor_position }) => {
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
    if (document.activeElement !== this._element) {
      return null;
    }

    if (this.next_cursor_position != null) {
      return this.next_cursor_position;
    } else {
      let { position } = get_current_carret_position(this._element);
      return position;
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
      var data = getCaretData(this._element, snapshot.start, snapshot.end);
      setCaretPosition(data);

      this.previous_cursor_position = snapshot;
      this.next_cursor_position = null;
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
    // ev.preventDefault();
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
        position
      } = get_current_carret_position(this._element);
      let value = `${before}*${selected}*${after}`;

      this.next_cursor_position = {
        start: position.start,
        end: position.end + 2
      };
      this.onChange(value);
      return;
    }

    // Cmd + i for Italic
    if (is_meta && ev.key === "i") {
      let {
        text: { before, selected, after },
        position
      } = get_current_carret_position(this._element);
      let value = `${before}/${selected}/${after}`;

      this.onChange(value);
      this.next_cursor_position = {
        start: position.start,
        end: position.end + 2
      };
      return;
    }

    // Cmd + u for Underline
    if (is_meta && ev.key === "u") {
      let {
        text: { before, selected, after },
        position
      } = get_current_carret_position(this._element);
      let value = `${before}_${selected}_${after}`;

      this.onChange(value);
      this.next_cursor_position = {
        start: position.start,
        end: position.end + 2
      };
      return;
    }

    let surround_keys = {
      "'": "'",
      '"': '"',
      "(": ")",
      "`": "`",
      _: "_",
      "*": "*",
      "/": "/"
    };
    if (surround_keys[ev.key]) {
      let after_key = surround_keys[ev.key];
      let {
        text: { before, selected, after },
        position
      } = get_current_carret_position(this._element);

      if (selected !== "") {
        ev.preventDefault();
        this.next_cursor_position = {
          start: position.start,
          end: position.end + 2
        };
        let value = `${before}${ev.key}${selected}${after_key}${after}`;
        console.log("value:", value);
        this.onChange(value);
        return;
      }
    }

    if (ev.which === 13) {
      // ev.preventDefault();

      if (multiline === false) {
        ev.preventDefault();
        ev.currentTarget.blur();
        return;
      }

      if (ev.shiftKey === true) {
        return;
      }

      ev.preventDefault();

      let {
        text: { before, selected, after },
        position
      } = get_current_carret_position(this._element);

      if (selected.includes("\n") === false) {
        let line_start = before.lastIndexOf("\n") + 1;
        let line_end = after.indexOf("\n");

        // prettier-ignore
        let line = `${before.slice(line_start)}${selected}${after.slice(0, line_end)}`;
        console.log(`line: "${line}"`);
        let line_match = line.match(new RegExp(unordered_list_regex.source));
        if (line_match) {
          let [_, spaces, line_text] = line_match;

          if (line_text.trim() === "") {
            let line = null;
            console.log("spaces.length:", spaces.length);
            if (spaces.length === 0) {
              this.next_cursor_position = {
                start: position.start - 2,
                end: position.end - 2
              };
              line = "";
            } else if (spaces.length < 2) {
              this.next_cursor_position = {
                start: position.start - spaces.length,
                end: position.end - spaces.length
              };
              line = "* ";
            } else if (spaces.length >= 2) {
              this.next_cursor_position = {
                start: position.start - 2,
                end: position.end - 2
              };
              line = `${' '.repeat(spaces.length - 2)}* `
              // prettier-ignore
            }

            let value = `${before.slice(0, line_start)}  ${line}${after.slice(
              line_end
            )}`;
            this.onChange(value);
            return;
          } else {
            this.next_cursor_position = {
              start: position.start + 3 + spaces.length,
              end: position.end - selected.length + 3 + spaces.length
            };
            // prettier-ignore
            let value = `${before}\n${spaces}* ${after}`;
            this.onChange(value);
            return;
          }

          // this.next_cursor_position = {
          //   start: position.start + 2,
          //   end: position.end - selected.length + 1
          // };
          // // prettier-ignore
          // let value = `${before.slice(0, line_start)}  ${line}${after.slice(line_end)}`;
          // this.onChange(value);
          // return;
        }
      }

      let value = `${before}\n${after === "" ? "\n" : after}`;

      this.next_cursor_position = {
        start: position.start + 1,
        end: position.end - selected.length + 1
      };
      this.onChange(value);
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
    let { meta_active } = this.state;

    let html = bearify(content, meta_active);

    return (
      <React.Fragment>
        <Keyboard
          onMetaChange={new_meta => {
            if (meta_active !== new_meta) {
              this.setState({ meta_active: new_meta });
            }
          }}
        />
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
      </React.Fragment>
    );
  }
}

ContentEditable.defaultProps = defaultProps;

export default ContentEditable;
