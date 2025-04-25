from kafka import KafkaConsumer, KafkaProducer
import json
import time

def kafka_listener():
    consumer = KafkaConsumer(
        'dog-photos',
        bootstrap_servers='kafka.dsata.svc.cluster.local:9092',
        auto_offset_reset='earliest',
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        group_id='doggo-processor'
    )

    producer = KafkaProducer(
        bootstrap_servers='kafka.dsata.svc.cluster.local:9092',
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

    print("👂 Kafka listener started...")

    for msg in consumer:
        data = msg.value
        photo_id = data['id']
        filename = data.get('filename', 'unknown')

        print(f"📥 Received photo ID {photo_id}, filename {filename}")

        # Simulate AI model output
        time.sleep(1)
        result = {
            "id": photo_id,
            "result": "yes good"
        }

        producer.send('dog-assessments', result)
        print(f"✅ Assessed {photo_id}: yes good")
