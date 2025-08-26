module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'feat', // New feature
                'fix', // Bug fix
                'docs', // Documentation only changes
                'style', // Changes that do not affect the meaning of the code
                'refactor', // Code change that neither fixes a bug nor adds a feature
                'perf', // Code change that improves performance
                'test', // Adding missing tests or correcting existing tests
                'chore', // Changes to the build process or auxiliary tools
                'revert', // Reverts a previous commit
                'build', // Changes that affect the build system or external dependencies
                'ci', // Changes to CI configuration files and scripts
            ],
        ],
    },
};
