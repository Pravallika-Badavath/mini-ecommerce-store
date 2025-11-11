pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/Pravallika-Badavath/mini-ecommerce-store.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    sh 'docker build -t ecommerce-full .'
                }
            }
        }

        stage('Run Container') {
            steps {
                script {
                    sh '''
                        docker stop ecommerce-full-container || true
                        docker rm ecommerce-full-container || true
                        docker run -d -p 4000:4000 --name ecommerce-full-container ecommerce-full
                    '''
                }
            }
        }
    }

    post {
        success {
            echo '🚀 Application successfully deployed on Docker!'
        }
        failure {
            echo '❌ Build failed. Check logs for errors.'
        }
    }
}
