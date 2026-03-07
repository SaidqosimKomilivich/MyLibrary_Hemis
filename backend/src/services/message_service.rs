use crate::dto::message::MessageResponseDto;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use uuid::Uuid;

#[derive(Clone)]
pub struct MessageService {
    /// Each user_id maps to a broadcast sender of MessageResponseDto.
    /// We use broadcast because a single user might have multiple tabs/devices open.
    connections: Arc<Mutex<HashMap<Uuid, broadcast::Sender<MessageResponseDto>>>>,
}

impl MessageService {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Add a new SSE subscriber for a user, returning a receiving channel.
    pub fn subscribe(&self, user_id: Uuid) -> broadcast::Receiver<MessageResponseDto> {
        let mut conns = self.connections.lock().unwrap();

        // If sender for this user_id doesn't exist, create it with capacity of 16 messages
        let sender = conns.entry(user_id).or_insert_with(|| {
            let (tx, _rx) = broadcast::channel(16);
            tx
        });

        sender.subscribe()
    }

    /// Push a real-time message to a specific user using their UUID.
    /// Returns true if at least one subscriber received it, false if user is offline.
    pub fn send_message(&self, receiver_id: Uuid, message: MessageResponseDto) -> bool {
        let conns = self.connections.lock().unwrap();

        if let Some(sender) = conns.get(&receiver_id) {
            // Send to all active subscribers for this user.
            // Result is Ok(num_receivers) if at least one receiver, else Err(SendError).
            return sender.send(message).is_ok();
        }
        false
    }

    /// Broadcast a list of messages (one per receiver) to all online users via SSE.
    /// Typically called after create_broadcast in the repository.
    pub fn broadcast_messages(&self, messages: Vec<MessageResponseDto>) {
        for msg in messages {
            if let Some(recv_id) = msg.receiver_id {
                self.send_message(recv_id, msg);
            }
        }
    }
}
