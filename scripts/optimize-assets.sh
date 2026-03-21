#!/bin/bash

# E3 Catalog Asset Optimization Utility
# This script provides commands to compress 3D models (DRACO) and optimize videos (Faststart)
# before uploading them to the platform.

echo "🚀 E3 Catalog Asset Optimizer"
echo "----------------------------"

# 1. 3D Model Optimization (Requires: npm install -g gltf-pipeline)
optimize_3d() {
    local input=$1
    local output="${input%.*}-draco.glb"
    echo "📦 Compressing 3D Model: $input"
    if command -v gltf-pipeline &> /dev/null; then
        gltf-pipeline -i "$input" -o "$output" -d
        echo "✅ Created optimized model: $output"
    else
        echo "❌ Error: gltf-pipeline is not installed."
        echo "   Run: npm install -g gltf-pipeline"
    fi
}

# 2. Video Optimization (Requires: ffmpeg)
optimize_video() {
    local input=$1
    local output="${input%.*}-optimized.mp4"
    echo "🎬 Optimizing Video: $input"
    if command -v ffmpeg &> /dev/null; then
        ffmpeg -i "$input" -c:v libx264 -crf 23 -preset medium -movflags +faststart -c:a aac -b:a 128k "$output"
        echo "✅ Created faststart video: $output"
    else
        echo "❌ Error: ffmpeg is not installed."
        echo "   Install it via your package manager (e.g., brew install ffmpeg)"
    fi
}

if [ -z "$1" ]; then
    echo "Usage:"
    echo "  ./optimize-assets.sh <file.glb>  # Optimize 3D Model"
    echo "  ./optimize-assets.sh <file.mp4>  # Optimize Video"
    exit 1
fi

case "$1" in
    *.glb|*.gltf)
        optimize_3d "$1"
        ;;
    *.mp4|*.mov|*.avi)
        optimize_video "$1"
        ;;
    *)
        echo "❌ Unsupported file format: $1"
        exit 1
        ;;
esac
