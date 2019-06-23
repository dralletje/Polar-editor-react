import React, { useEffect } from "react";
import { last, escapeRegExp, debounce } from "lodash";
import styled from "styled-components";

let BearStyle = styled.div`
  /* Render "\n" as newlines, instead of just "<br />" */
  white-space: pre-wrap;

  font-size: inherit;
  /* line-height: 1.35em; */
  overflow: hidden;

  .bear-line {
    /* min-height: 1.35em; */
  }
  .bear-hide {
    display: none;
  }

  /* Use special styles for when we are in view mode */
  /* Maybe also make separate component for this, that creates simpler html even */
  /* TODO Render non-editable by default, make editable styles the exception */
  ${p => (p.contentEditable === false ? "&" : "&.not")} {
    .subtle,
    .subtle-effect-only {
      display: none !important;
    }

    a {
      cursor: pointer !important;
      /* &:hover {
        background-color: transparent !important;
      } */
      &::before {
        display: none !important;
      }
    }
  }

  /* Render code nice */
  & .bear-code {
    position: relative;
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;

    font-size: inherit;

    padding-right: 0.23em;
    padding-left: 0.23em;
    z-index: 0;

    &::before {
      content: "";
      z-index: -1;

      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;

      background-color: white;
      box-shadow: 0px 0px 0px 0.05em rgb(203, 203, 203) inset;

      border-radius: 0.11em;
    }
  }

  .bear-decoration {
    color: transparent;
    caret-color: black;

    display: inline-block;
    width: 1.1em;
    
    &::before {
      pointer-events: none;
    }
  }
  .bear-decoration-quote {
    letter-spacing: 0.135em;
    &::before {
      content: "";
      position: absolute;
      margin-left: 0.2em;
      pointer-events: none;

      font-size: 1.2em;
      background-color: ${p => p.accent_color};
      width: 0.16em;
      top: 0;
      bottom: 0;
    }
  }
  .bear-decoration-circle {
    letter-spacing: 0.27em;
    position: relative;
    &::before {
      content: "•";
      position: absolute;
      margin-left: 2px;
      
      font-size: 1.2em;
      color: ${p => p.accent_color};
    }
  }
  .bear-decoration-dash {
    letter-spacing: 0.3em;

    &::before {
      content: "-";
      position: absolute;
      font-size: 1.2em;
      color: ${p => p.accent_color};
    }
  }

  .bear-tabs {
    tab-size: 1.1em;
  }
  .bear-block {
    display: inline-block;
    white-space: nowrap;
    position: relative;
    width: 100%;

    > * {
      vertical-align: top;
      white-space: pre-wrap;
      display: inline-block;
    }

    .bear-text {
      display: inline-block;
      white-space: pre-wrap;
      padding-right: 20%;
    }
    .bear-tabs {
      white-space: pre;
      vertical-align: top;
    }
  }

  .bear-list-number {
    color: ${p => p.accent_color};
    caret-color: black;
    display: inline-block;

    width: 1.11em;
    font-variant-numeric: tabular-nums;
  }

  .subtle {
    opacity: 0.5;
  }
  .subtle-effect-only {
    color: transparent;
    caret-color: #676a6c;
  }

  .bear-underline {
    text-decoration: underline;
    text-decoration-color: ${p => p.accent_color};
  }

  .header-1, .header-2, .header-3 {
    display: inline-block;

    &.header-1 {
      font-size: 1.4em;
      font-weight: bold;
      margin-bottom: 0.55em;
      margin-top: 0.27em;

      .subtle::before {
        content: "1";
      }
    }

    &.header-2 {
      font-size: 1.2em;
      font-weight: bold;
      margin-bottom: 0.55em;
      margin-top: 0.27em;

      .subtle::before {
        content: "2";
      }
    }

    &.header-3 {
      font-weight: bold;

      .subtle::before {
        content: "3";
      }
    }

    .subtle-header {
      display: inline-block;
      position: relative;
    }
    .subtle-header::before {
      content: "";
      position: absolute;
      bottom: 0;
      right: 0.1em;
      font-size: 0.5em;
      letter-spacing: 0;
      line-height: normal;
    }
  }

  a {
    text-decoration: underline;
    position: relative;
    color: ${p => p.accent_color};
    white-space: nowrap;

    cursor: text;
    /* cursor: pointer; */

    &[contenteditable="false"] {
      cursor: pointer;
    }

    &:hover {
      background-color: rgba(0, 0, 0, .1);
    }
  }
  
  a::before {
    content: "⌘/ctrl + click to open";
    color: black;
    position: absolute;
    top: calc(100% + 5px);
    right: 0;
    width: 120px;
    font-size: 0.7em;
    background-color: #fff;
    display: block;
    padding-left: 6px;
    padding-right: 6px;
    padding-top: 3px;
    padding-bottom: 3px;
    border-radius: 3px;
    box-shadow: 0px 1px 3px #00000063;
    z-index: 100;
    pointer-events: none;
    line-height: 1.2em;

    opacity: 0;
    transition: opacity .2s;
  }
  a:hover::before {
    opacity: 1;
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

  let last_node = last(nodes);

  if (last_node == null) {
    return {
      start: { node: root_element, offset: 0 },
      end: { node: root_element, offset: 0 }
    };
  } else {
    return {
      start: start_result || {
        node: last_node,
        offset: last_node.nodeValue.length
      },
      end: end_result || {
        node: last(nodes),
        offset: last_node.nodeValue.length
      }
    };
  }
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
    console.log("Range err:", err);
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
    let regex_source = regexps[0];
    let match = regex_source.match(/^\s*\/(.*)\/([g]*)\s*$/);
    if (match == null) {
      throw new Error("Bay");
    }
    return new RegExp(match[1], match[2]);
  }

  let head = regexps.slice(0, 1)[0];
  let body = regexps.slice(1, -1);
  let tail = regexps.slice(-1)[0];

  let head_match = head.match(/^\s*\/((.|\n)*)/);
  if (!head_match) {
    throw new Error(`Wow`);
  }
  let tail_match = tail.match(/(.*)\/([g]*)\s*$/);
  if (!tail_match) {
    throw new Error(`Wow`);
  }

  head = head_match[1];
  tail = tail_match[1];
  let modifiers = tail_match[2];

  let source = `${head}${escapes
    .map((escapee, i) => {
      if (escapee instanceof RegExp) {
        return `${escapee.source}${body[i] || ""}`;
      }
      if (typeof escapee === "string") {
        return `${escapeRegExp(escapee)}${body[i] || ""}`;
      }
      throw new Error(`Unknown escappee type in regexp "${escapee}"`);
    })
    .join("")}${tail}`;

  return new RegExp(source, modifiers);
};

let markdown_style_boundaries = (boundary, { with_spaces = false } = {}) => {
  let b = boundary;
  let margin = regexp`/[^a-zA-Z0-9:${b}]/`;
  let padding = regexp`/[^${with_spaces ? "" : " "}${b}\n<>]/`;
  let body = regexp`/[^\n<>${b}]*/`;

  // prettier-ignore
  let regex = regexp`/(${margin})${b}(${padding}(?:${body}${padding})?)${b}(?=${margin})/g`;
  return regex;
};

let g = regex => new RegExp(regex.source, `${regex.flags}g`);

// let character_map = {
//   '-': '&#45;',
//   '*': '&#42;',
//   '_': '&#95;',
// }

let url_regex = /( |^|\n)((?:http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+(?:[-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(?::[0-9]{1,5})?(?:\/.*)?)(?= |$|\n)/;
let unordered_list_regex = /(?<=^|\n)((?:\t)*)(\* )([^\n]*)()(?=$|\n)/;
let unordered_dash_list_regex = /(?<=^|\n)((?:\t)*)(- )([^\n]*)()(?=$|\n)/;
let ordered_list_regex = /(?<=^|\n)((?:\t)*)(\d+\. )([^\n]*)()(?=$|\n)/;
let ordered_full_list_regex = /(?<=^|\n)(((?:\t)*)(\d+\. )([^\n]*)($|\n))+/;
let quote_list = /(?<=^|\n)((?:\t)*)((?:&gt;|>) )([^\n]*)()(?=$|\n)/;
let indented_line = /(?<=^|\n)(\t+)()(.*)()(?=$|\n)/;
let line = /(?<=^|\n)(.+)(\n)/;
let empty_line = /(?<=^|\n)(\n)/;

let quote_list_block = /(?<=^|\n)(\t*)(&gt;)(?: )([^\n]*)()($|\n)/;
let dash_list_block = /(?<=^|\n)(\t*)(- )([^\n]*)()($|\n)/;

let subtle = text => `<span class="subtle">${text}</span>`;
// let html = (character) => {
//   return character_map[character] || character;
// }

class StringMutationBuilder {
  mutations = [];

  replace(regex, replacement) {
    this.mutations.push({ type: "replace", regex, replacement });
    return this;
  }

  apply(string) {
    let result = string;
    for (let mutation of this.mutations) {
      if (mutation.type === "replace") {
        result = result.replace(mutation.regex, mutation.replacement);
      }
    }
    return result;
  }
}

let create_bear_parser = (is_meta = false) => {
  // TODO Replace with /proper/ markdown-like bear (that keeps all characters for cursor consistent)
  return (
    new StringMutationBuilder()
      // .replace(regexp`/[${Object.keys(character_map).join('')}]/g`, character => {
      //   return html(character);
      // })
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(
        /\[([^\]]*)?\]\(([^)\n]*)\)/g,
        `<a target="_blank" contenteditable="${
          is_meta ? "false" : "inherit"
        }" href="$2" title="$2">${subtle("[")}$1${subtle(`]($2)`)}</a>`
      )
      .replace(
        g(url_regex),
        `$1<a target="_blank" contenteditable="${
          is_meta ? "false" : "inherit"
        }" href="$2" title="$2">$2</a>`
      )
      .replace(
        g(unordered_list_regex),
        `<span class="bear-block"><span class="bear-tabs">$1</span><span class="bear-decoration bear-decoration-circle"><span>* </span></span><span class="bear-text">$3</span></span>`
      )
      .replace(
        g(quote_list_block),
        `<span class="bear-block"><span class="bear-tabs">$1</span><span class="bear-decoration bear-decoration-quote">$2 </span><span class="bear-text">$3</span></span>\n`
      )
      .replace(
        g(dash_list_block),
        `<span class="bear-block"><span class="bear-tabs">$1</span><span class="bear-decoration bear-decoration-dash">- </span><span class="bear-text">$3</span></span>\n`
      )
      // .replace(
      //   g(ordered_list_regex),
      //   `<span class="bear-tabs">$1</span><span class="bear-list-number">$3</span><span class="subtle">. </span><span>$3</span>`
      // )
      .replace(g(ordered_full_list_regex), full_match => {
        let current_text = full_match;
        let result = "";

        let current_indentation = null;
        let count = null;

        while (current_text !== "") {
          let [line, tabs, prefix, text, suffix] = current_text.match(
            ordered_list_regex
          );

          if (tabs.length !== current_indentation) {
            count = parseInt(prefix, 10);
            current_indentation = tabs.length;
          }

          let count_format = `<span class="bear-list-number">${count}. </span>`;
          let prefix_format =
            tabs.length === 0
              ? count_format
              : `${tabs.slice(
                  0,
                  -1
                )}<span class="bear-tabs">${"\t"}</span>${count_format}`;
          let formatted_line = `<span class="bear-block">${prefix_format}<span class="bear-text">${text}</span>${suffix}</span>\n`;
          // prettier-ignore
          result = result + formatted_line;
          count = count + 1;
          current_text = current_text.slice(line.length + 1);
        }

        return result;
      })
      .replace(
        markdown_style_boundaries("_"),
        '$1<span class="bear-underline"><span class="subtle-effect-only">_</span>$2<span class="subtle-effect-only">_</span></span>'
      )
      .replace(
        markdown_style_boundaries("/"),
        '$1<i><span class="subtle">/</span>$2<span class="subtle">/</span></i>'
      )
      .replace(
        markdown_style_boundaries("~"),
        '$1<del><span class="subtle-effect-only">~</span>$2<span class="subtle-effect-only">~</span></del>'
      )
      .replace(
        markdown_style_boundaries("-"),
        '$1<del><span class="subtle-effect-only">-</span>$2<span class="subtle-effect-only">-</span></del>'
      )
      .replace(
        markdown_style_boundaries("*"),
        '$1<b><span class="subtle">*</span>$2<span class="subtle">*</span></b>'
      )
      .replace(
        markdown_style_boundaries("`", { with_spaces: true }),
        '$1<span class="bear-code"><span class="subtle">`</span><span>$2</span><span class="subtle">`</span></span>'
      )
      .replace(
        /(\n|^)# ([^\n]+)(?=\n|$)/g,
        '$1<span class="header-1"><span class="subtle subtle-header"># </span>$2</span>'
      )
      .replace(
        /(\n|^)## ([^\n]+)(?=\n|$)/g,
        `$1<span class="header-2"><span class="subtle subtle-header">#<span class="bear-hide">#</span> </span>$2</span>`
      )
      .replace(
        /(\n|^)### ([^\n]+)(?=\n|$)/g,
        `$1<span class="header-3"><span class="subtle subtle-header">#<span class="bear-hide">##</span> </span>$2</span>`
      )
      .replace(
        g(indented_line),
        `<span class="bear-tabs">$1</span><span>$3</span>`
      )
      .replace(
        g(empty_line),
        `<div class="bear-line"><br /><span class="bear-hide">\n</span></div>`
      )
      .replace(
        g(line),
        `<div class="bear-line">$1<span  class="bear-hide">\n</span></div>`
      )
  );
  // Zero width non breaking space: &#8288;
  // Also zero width non breaking space: &#65279;
};

let is_meta_parser = create_bear_parser(true);
let not_is_meta_parser = create_bear_parser(false);

let bearify = (text, is_meta = false) => {
  if (is_meta) {
    return is_meta_parser.apply(text);
  } else {
    return not_is_meta_parser.apply(text);
  }
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

  let text = element.textContent || "";

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

let copy_text_to_clipboard = str => {
  const el = document.createElement("textarea"); // Create a <textarea> element
  el.value = str; // Set its value to the string that you want copied
  el.setAttribute("readonly", ""); // Make it readonly to be tamper-proof
  el.style.position = "absolute";
  el.style.left = "-9999px"; // Move outside the screen to make it invisible
  document.body.appendChild(el); // Append the <textarea> element to the HTML document
  const selected =
    document.getSelection().rangeCount > 0 // Check if there is any content selected previously
      ? document.getSelection().getRangeAt(0) // Store selection if found
      : false; // Mark as false to know no selection existed before
  el.select(); // Select the <textarea> content
  document.execCommand("copy"); // Copy - only works as a result of a user action (e.g. click events)
  document.body.removeChild(el); // Remove the <textarea> element
  if (selected) {
    // If a selection existed before copying
    document.getSelection().removeAllRanges(); // Unselect everything on the HTML document
    document.getSelection().addRange(selected); // Restore the original selection
  }
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

  return null;
};

let EditorOperations = {
  insert_around: ({ prefix, suffix, carret_position }) => {
    let {
      text: { before, selected, after },
      position
    } = carret_position;

    let text = `${before}*${selected}*${after}`;
    let cursor_position =
      selected === ""
        ? {
            start: position.start + 1,
            end: position.start + 1
          }
        : {
            start: position.start,
            end: position.end + 2
          };
    return { text, cursor_position };
  }
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
      let range = document.getSelection().getRangeAt(0);

      // Worry later about selections that extend outside of our element
      if (!this._element.contains(range.commonAncestorContainer)) {
        return;
      }
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

  onPaste = event => {
    event.preventDefault();

    let clipboardData = event.clipboardData || window.clipboardData;
    let pastedData = clipboardData.getData("Text");

    let {
      text: { before, selected, after },
      position: { start }
    } = get_current_carret_position(this._element);
    this.next_cursor_position = {
      start: start + pastedData.length,
      end: start + pastedData.length
    };
    this.onChange(`${before}${pastedData}${after}`);
  };

  onCopy = event => {
    event.preventDefault();

    let {
      text: { selected }
    } = get_current_carret_position(this._element);
    copy_text_to_clipboard(selected);
  };

  onCut = event => {
    event.preventDefault();

    let {
      text: { before, selected, after }
    } = get_current_carret_position(this._element);

    copy_text_to_clipboard(selected);
    this.emitChange({ text: `${before}${after}` });
  };

  emitChange({ text, cursor_position = null }) {
    if (this.props.editable) {
      if (cursor_position) {
        this.next_cursor_position = cursor_position;
      }

      text = text.replace(/#\u{2060}{2}/gu, "###");
      text = text.replace(/#\u{2060}/gu, "##");
      text = text.replace(/\u{2060}/gu, "");
      this.props.onChange(text);
    }
  }

  onChange(raw_value) {
    this.emitChange({ text: raw_value });
  }

  _onKeyDown = ev => {
    // let {
    //   text: { before, selected, after },
    //   position
    // } = get_current_carret_position(this._element);
    // console.log("position");

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
      this.emitChange(
        EditorOperations.insert_around({
          prefix: "*",
          suffix: "*",
          carret_position: get_current_carret_position(this._element)
        })
      );
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
      this.next_cursor_position =
        selected === ""
          ? {
              start: position.start + 1,
              end: position.start + 1
            }
          : {
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
      this.next_cursor_position =
        selected === ""
          ? {
              start: position.start + 1,
              end: position.start + 1
            }
          : {
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
        this.onChange(value);
        return;
      }
    }

    if (ev.key === "Tab") {
      ev.preventDefault();
      let {
        text: { before, selected, after },
        position
      } = get_current_carret_position(this._element);

      let lines_start_position = selected.startsWith("\n")
        ? before.length
        : before.lastIndexOf("\n");
      let lines_end_position = selected.endsWith("\n")
        ? 0
        : after.indexOf("\n");

      // prettier-ignore
      let lines = `${before.slice(lines_start_position)}${selected}${after.slice(0, lines_end_position)}`
      let indented_lines = ev.shiftKey
        ? lines.replace(/\n\t/g, "\n")
        : lines.replace(/\n/g, "\n\t");
      before = before.slice(0, lines_start_position);
      after = after.slice(lines_end_position);

      this.next_cursor_position = {
        start:
          position.start +
          (ev.shiftKey ? (lines.startsWith("\n\t") ? -1 : 0) : 1),
        end: position.end + (indented_lines.length - lines.length)
      };
      this.onChange(`${before}${indented_lines}${after}`);
    }

    if (ev.key === "Enter") {
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

      // console.group("Enter pressed");

      if (selected.includes("\n") === false) {
        let line_start = before.lastIndexOf("\n") + 1;
        let line_end = after.indexOf("\n");

        // prettier-ignore
        let line = `${before.slice(line_start)}${selected}${after.slice(0, line_end)}`;
        // console.log({ line });
        let line_match =
          line.match(unordered_list_regex) ||
          line.match(ordered_list_regex) ||
          line.match(quote_list) ||
          line.match(unordered_dash_list_regex) ||
          line.match(indented_line);
        // console.log({ line_match });

        if (line_match) {
          let [_, tabs, prefix, line_text, suffix] = line_match;

          if (line_text.trim() === "") {
            let line = null;
            if (tabs.length === 0) {
              this.next_cursor_position = {
                start: position.start - prefix.length,
                end: position.end - prefix.length
              };
              line = "";
            } else if (tabs.length === 1) {
              this.next_cursor_position = {
                start: position.start - 1,
                end: position.end - 1
              };
              line = `${prefix}`;
            } else if (tabs.length > 1) {
              this.next_cursor_position = {
                start: position.start - 1,
                end: position.end - 1
              };
              line = `${'\t'.repeat(tabs.length - 1)}${prefix}`
              // prettier-ignore
            }

            let value = `${before.slice(0, line_start)}${line}${after.slice(
              line_end
            )}`;
            this.onChange(value);
            console.groupEnd("Enter pressed");
            return;
          } else {
            let line = `${tabs}${prefix}${suffix}`;
            this.next_cursor_position = {
              start: position.start + 1 + line.length,
              end: position.start + 1 + line.length
            };
            let value = `${before}\n${line}${after}`;
            this.onChange(value);
            console.groupEnd("Enter pressed");
            return;
          }
        }
      }

      let value = `${before}\n${after === "" ? "\n" : after}`;
      this.next_cursor_position = {
        start: position.start + 1,
        end: position.start + 1
      };
      this.onChange(value);
      console.groupEnd("Enter pressed");
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
      accent_color,
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
          // onselectionchange={(x) => {
          //   console.log({ x });
          // }}
          accent_color={accent_color || "rgba(200, 0, 0)"}
          ref={ref => {
            this._element = ref;
            innerRef(ref);
          }}
          style={style}
          contentEditable={editable}
          dangerouslySetInnerHTML={{ __html: html }}
          onInput={ev => {
            this.onChange(this._element.textContent);
          }}
          onKeyDown={this._onKeyDown}
          onPaste={this.onPaste}
          onCopy={this.onCopy}
          onCut={this.onCut}
        />
      </React.Fragment>
    );
  }
}

ContentEditable.defaultProps = defaultProps;

export default ContentEditable;
