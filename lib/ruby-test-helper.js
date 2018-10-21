'use babel';

import RubyTestHelperView from './ruby-test-helper-view';
import { CompositeDisposable } from 'atom';

export default {

  rubyTestHelperView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.rubyTestHelperView = new RubyTestHelperView(state.rubyTestHelperViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.rubyTestHelperView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    const testRegex = /.*test[\s\(]+["'](.+?)["'][\s\)]+do.*/g
    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'ruby-test-helper:test-as-command': () => this.getRubyTestAsCommand(testRegex)
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'ruby-test-helper:test-as-command-regex': () => this.getRubyTestAsRegexCommand(testRegex)
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.rubyTestHelperView.destroy();
  },

  serialize() {
    return {
      rubyTestHelperViewState: this.rubyTestHelperView.serialize()
    };
  },

  isRailsTestFile(editor) {
    if(!editor) {
      return false
    }
    if(!editor.getFileName()) {
      atom.notifications.addError("Could not convert test to command.", {
        detail: "There is not a file name, try saving this test first."
      })
      return false
    }
    if(!editor.isModified()) {
      atom.notifications.addWarning("File has unsaved changes.", {
        detail: "This file has changes that have not been saved. This may change your test results."
      })
      return false
    }
  },

  getRubyTestAsCommand(testRegex) {
    let editor = atom.workspace.getActiveTextEditor()
    if (this.isRailsTestFile(editor)) {
      let path = editor.getPath()
      let index
      // Check if full path matches rails path format if so remove it
      if(index = path.lastIndexOf("/test/")) {
        path = path.substring(index + 1)
      }

      const testLines = []
      // If lines are selected check all lines for mathing test format
      const rangeToCheck = editor.getSelectedScreenRanges();
      // if lines arent selected check if the current line is test format
      if(rangeToCheck.length === 0) {
        rangeToCheck.push(editor.getCursorBufferPosition())
      }
      // If nothing matches the test format then it will run the whole test
      editor.getSelectedScreenRanges().forEach(range => {
        for(let k = range.start.row; k <= range.end.row; k++) {
          if(editor.lineTextForBufferRow(k).match(testRegex)) {
            testLines.push(':' + (k+1)) // Add one because range is 0 indexed
          }
        }
      })
      atom.clipboard.write("rails test " + path + testLines.join(''))
      return
    }
  },

  getRubyTestAsRegexCommand(testRegex) {
    let editor = atom.workspace.getActiveTextEditor()
    if (this.isRailsTestFile(editor)) {
      let testToRun = []

      // Convert test name to rails format
      const fileName = editor.getFileName()
        .replace('.rb','')
        .replace(/(^|_)[a-z](?=[a-z]*)/g, function(letter) { return letter.toUpperCase(); } )
        .replace(/_/g,'');

      // If lines are selected check all lines for mathing test format
      let textToCheck = editor.getSelectedText()
      // if lines arent selected check if the current line is test format
      if(textToCheck === '') {
        textToCheck = editor.lineTextForBufferRow(editor.getCursorBufferPosition().row)
      }
      // only keep text that matches test format and alter it to match test command format
      textToCheck.replace(testRegex, function(s, match) {
        testToRun.push('(^' + fileName + '#test_' + match.replace(/\s/g, '_') + '$)')
      })

      if(testToRun.length > 0) {
        atom.clipboard.write("rake test TESTOPTS='-n /" + testToRun.join('|') + "/'")
      } else {
        atom.notifications.addError("Could not convert test to command.", {
          detail: "Could not find tests on line/in selection. Expected format is 'test 'foo' do"
        })
        return
      }
    }
  },

};
