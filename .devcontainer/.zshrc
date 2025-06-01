export ZSH="$HOME/.oh-my-zsh"

ZSH_THEME="robbyrussell"

source $ZSH/oh-my-zsh.sh

function nx() {
   npx nx "$@"
}

# initialise completions with ZSH's compinit
autoload -Uz compinit && compinit

plugins=(git)
# plugins+=(asdf)
