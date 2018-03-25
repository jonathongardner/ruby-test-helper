'use babel';

import RubyTestTextView from './ruby-test-text-view';
import { CompositeDisposable } from 'atom';

export default {

  rubyTestTextView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.rubyTestTextView = new RubyTestTextView(state.rubyTestTextViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.rubyTestTextView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'ruby-test-text:test-as-command': () => this.getRubyTestAsCommand()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.rubyTestTextView.destroy();
  },

  serialize() {
    return {
      rubyTestTextViewState: this.rubyTestTextView.serialize()
    };
  },

  getRubyTestAsCommand() {
    let editor
    if (editor = atom.workspace.getActiveTextEditor()) {
      if(!editor.getFileName()) {
        atom.notifications.addError("Could not convert test to command.", {
          detail: "There is not a file name, try saving this test first."
        })
        return
      }
      let testToRun = []
      const fileName = editor.getFileName().replace('.rb','')
      let textToCheck = editor.getSelectedText()
      if(textToCheck !== '') {
        textToCheck = editor.lineTextForBufferRow(editor.getCursorBufferPosition().row)
      }
      textToCheck.replace(/.*test[\s\(]+["']'(.+?)["']'[\s\)]+do.*/, function(s, match) {
        testToRun.push('(' + fileName + '#test_' + match.replace(' ', '_') + ')')
      })
      if(testToRun.length > 0) {
        atom.clipboard.write("rake test TESTOPTS='-n /" + testToRun.join('|') + "/''")
      } else {
        atom.notifications.addError("Could not convert test to command.", {
          detail: "Could not find tests on line/in selection. Expected format is 'test 'foo' do"
        })
        return
      }
    }
  }
};
