#!/usr/bin/env node

/**
 * YouTube Karaoke Extension Packaging Script
 * Creates a distributable package for the extension
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJson = require('./package.json');
const version = packageJson.version;
const extensionName = 'youtube-karaoke-extension';
const packageName = `${extensionName}-v${version}`;

console.log('🎤 YouTube Karaoke Extension Packaging Script');
console.log('============================================');
console.log(`Version: ${version}`);
console.log(`Package: ${packageName}`);
console.log('');

// Create package directory
const packageDir = path.join(__dirname, 'packages', packageName);
if (fs.existsSync(packageDir)) {
    console.log('🗑️  Cleaning existing package directory...');
    fs.rmSync(packageDir, { recursive: true, force: true });
}

console.log('📁 Creating package directory...');
fs.mkdirSync(packageDir, { recursive: true });

// Build the extension
console.log('🔨 Building extension...');
try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed successfully');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

// Copy extension files
console.log('📦 Copying extension files...');
const filesToCopy = [
    'manifest.json',
    'dist/content.js',
    'dist/content.css',
    'dist/background.js',
    'dist/popup.js',
    'dist/popup.css',
    'dist/popup.html',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png'
];

// Copy files and flatten the dist structure
filesToCopy.forEach(file => {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(packageDir, file.replace('dist/', ''));
    
    if (fs.existsSync(srcPath)) {
        // Create directory if it doesn't exist
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        
        fs.copyFileSync(srcPath, destPath);
        console.log(`  ✅ Copied ${file} -> ${file.replace('dist/', '')}`);
    } else {
        console.log(`  ⚠️  File not found: ${file}`);
    }
});

// Create installation guide
console.log('📝 Creating installation guide...');
const installationGuide = `# YouTube Karaoke Extension - Installation Guide

## Quick Installation

1. **Download** this package to your computer
2. **Extract** the files to a folder
3. **Open** Brave/Chrome and go to \`brave://extensions/\` or \`chrome://extensions/\`
4. **Enable** "Developer mode" (toggle in top-right corner)
5. **Click** "Load unpacked" and select the extracted folder
6. **Visit** YouTube and start using the extension!

## Features

- 🎵 Split-panel interface for playlist management
- 🔍 Advanced YouTube search with filters
- 📋 Smart playlist management
- 🎯 Visual feedback for currently playing video
- ⌨️ Keyboard shortcuts for power users

## Support

- **Version**: ${version}
- **Compatibility**: Brave Browser, Chrome Browser
- **Requirements**: YouTube account (for search functionality)

## Troubleshooting

If you encounter any issues:
1. Make sure you're using a supported browser
2. Check that Developer mode is enabled
3. Try reloading the extension
4. Ensure you're logged into YouTube

Enjoy your karaoke experience! 🎤
`;

fs.writeFileSync(path.join(packageDir, 'INSTALLATION.md'), installationGuide);

// Create package info
console.log('📋 Creating package info...');
const packageInfo = {
    name: extensionName,
    version: version,
    description: 'Transform YouTube into a karaoke experience with a powerful split-panel interface',
    author: 'YouTube Karaoke Team',
    created: new Date().toISOString(),
    files: filesToCopy.filter(file => fs.existsSync(path.join(__dirname, file))),
    manifest: {
        version: version,
        name: 'YouTube Karaoke - Split Panel Player',
        description: 'Transform YouTube into a karaoke experience with a powerful split-panel interface for playlist management and advanced search.'
    }
};

fs.writeFileSync(
    path.join(packageDir, 'package-info.json'), 
    JSON.stringify(packageInfo, null, 2)
);

// Create ZIP file
console.log('🗜️  Creating ZIP package...');
try {
    const zipPath = path.join(__dirname, 'packages', `${packageName}.zip`);
    
    // Use PowerShell on Windows, zip on other platforms
    if (process.platform === 'win32') {
        execSync(`powershell -command "Compress-Archive -Path '${packageDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
    } else {
        execSync(`cd '${packageDir}' && zip -r '${zipPath}' .`, { stdio: 'inherit' });
    }
    
    console.log(`✅ ZIP package created: ${zipPath}`);
} catch (error) {
    console.log('⚠️  Could not create ZIP file:', error.message);
    console.log('   You can manually zip the package directory');
}

// Display package summary
console.log('');
console.log('📦 Package Summary');
console.log('==================');
console.log(`Package Name: ${packageName}`);
console.log(`Package Directory: ${packageDir}`);
console.log(`Files Included: ${filesToCopy.filter(file => fs.existsSync(path.join(__dirname, file))).length}`);
console.log(`Total Size: ${getDirectorySize(packageDir)}`);

console.log('');
console.log('🎉 Packaging completed successfully!');
console.log('');
console.log('Next steps:');
console.log('1. Test the package by loading it in your browser');
console.log('2. Upload to extension store or distribute the ZIP file');
console.log('3. Share with users and get feedback');

function getDirectorySize(dirPath) {
    let totalSize = 0;
    
    function calculateSize(itemPath) {
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
            const files = fs.readdirSync(itemPath);
            files.forEach(file => calculateSize(path.join(itemPath, file)));
        } else {
            totalSize += stats.size;
        }
    }
    
    calculateSize(dirPath);
    
    if (totalSize < 1024) {
        return `${totalSize} B`;
    } else if (totalSize < 1024 * 1024) {
        return `${(totalSize / 1024).toFixed(1)} KB`;
    } else {
        return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
    }
}
