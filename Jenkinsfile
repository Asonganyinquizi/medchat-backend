pipeline {
    agent any
    tools {
        nodejs 'NodeJS'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }
       stage('Lint & Format Check') {
    steps {
        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
            bat 'npm run lint'
        }
    }
}

        stage('Build Backend') {
            steps {
                bat 'npx prisma generate'
                bat 'npm run build'
            }
        }
        stage('Deploy Backend') {
            steps {
                bat 'npm start'
            }
        }
    }
    post {
        always {
            echo 'Backend Build completed.'
        }
        failure {
            echo 'Backend Pipeline failed!'
        }
    }
}
