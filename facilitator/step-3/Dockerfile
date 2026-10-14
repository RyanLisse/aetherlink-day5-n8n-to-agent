FROM node:22-bookworm-slim

ENV DISABLE_AUTOUPDATER=1
WORKDIR /workshop

RUN chown node:node /workshop

RUN apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global @anthropic-ai/claude-code@2.1.287

COPY --chown=node:node . .
USER node
RUN npm ci

CMD ["npm", "run", "verify"]
