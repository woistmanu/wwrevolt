<?php
declare(strict_types=1);

namespace App\FrontModule\Presenters\;

use Nette;
use App\Model\ChatRepository;

class ChatPresenter extends Nette\Application\UI\Presenter

/**
 * ChatModel
 *
 * Diese Klasse ist für die Verwaltung von Chat-Nachrichten und Benutzern verantwortlich.
 */
final class ChatModel {
  private Context $database;
  private User $user;

  public function __construct(Context $database, User $user) {
    $this->database = $database;
    $this->user = $user;
  }

  /**
   * Holt Chat-Nachrichten basierend auf einer Spalte und einem Wert.
   */
  public function getTexts(string $column, $value, int $limit): ChatMessagesCollection {
    $rows = $this->database->table('chat_messages')
                           ->where($column, $value)
                           ->limit($limit)
                           ->fetchAll();

    $collection = new ChatMessagesCollection();
    foreach ($rows as $row) {
      $sender = $this->database->table('user')->get($row->sender_id);
      $receiver = $row->receiver_id ? $this->database->table('user')->get($row->receiver_id) : null;

      $collection[] = new ChatMessage(
        $row->id, 
        $row->message, 
        $row->created_at, 
        $sender ? $sender->username : 'Unknown', 
        $sender ? $sender->avatar : null, 
        $receiver ? $receiver->username : null
      );
    }

    return $collection;
  }

  /**
   * Holt aktive Benutzer basierend auf der letzten Aktivität.
   */
  public function getActiveUsers(): ChatUsersCollection {
    $this->database->table('user')
                   ->where('id', $this->user->id)
                   ->update(['last_active' => new \DateTimeImmutable()]);

    $rows = $this->database->table('user')
                           ->where('last_active >= ?', new \DateTimeImmutable('-5 minutes'))
                           ->fetchAll();

    $collection = new ChatUsersCollection();
    foreach ($rows as $row) {
      $collection[] = new ChatUser($row->id, $row->username, $row->avatar);
    }

    return $collection;
  }
  
  /**
   * Fügt eine neue Nachricht in die chat_messages-Tabelle ein.
   */
  public function addMessage(string $message, int $receiverId = null, string $chatType = 'main'): void {
    $this->database->table('chat_messages')->insert([
      'message' => $message,
      'sender_id' => $this->user->id,
      'receiver_id' => $receiverId,
      'chat_type' => $chatType,
      'created_at' => new \DateTimeImmutable(),
    ]);
  }
}
