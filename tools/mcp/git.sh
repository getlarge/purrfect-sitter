#!/bin/bash

docker run --rm -i --mount type=bind,src=$PWD,dst=/worskspace mcp/git
