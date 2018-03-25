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

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'ruby-test-helper:test-as-command': () => this.getRubyTestAsCommand()
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
      const fileName = editor.getFileName()
        .replace('.rb','')
        .replace(/(^|_)[a-z](?=[a-z]*)/g, function(letter) { return letter.toUpperCase(); } )
        .replace(/_/g,'');

      let textToCheck = editor.getSelectedText()
      if(textToCheck === '') {
        textToCheck = editor.lineTextForBufferRow(editor.getCursorBufferPosition().row)
      }
      textToCheck.replace(/.*test[\s\(]+["'](.+?)["'][\s\)]+do.*/g, function(s, match) {
        testToRun.push('(' + fileName + '#test_' + match.replace(/\s/g, '_') + ')')
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
  }
};
