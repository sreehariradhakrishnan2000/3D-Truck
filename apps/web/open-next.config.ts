import { defineCloudflareConfig } from '@opennextjs/cloudflare';

const config = {
  ...defineCloudflareConfig(),
  imageOptimization: {
    install: null,
  },
};

export default config;
