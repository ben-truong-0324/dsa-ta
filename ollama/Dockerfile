FROM ollama/ollama

# Preload the desired model during build (optional)
RUN ollama pull tinyllama

# Use entrypoint override or startup command
CMD ["ollama", "serve"]