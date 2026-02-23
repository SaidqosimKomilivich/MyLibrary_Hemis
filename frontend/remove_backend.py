import os

backend_dir = "/home/saidqosim/Desktop/MyLibrary/backend"

files_to_delete = [
    "migrations/010_news.sql",
    "src/dto/news.rs",
    "src/models/news.rs",
    "src/repository/news_repository.rs",
    "src/handlers/news_handler.rs"
]

for f in files_to_delete:
    path = os.path.join(backend_dir, f)
    if os.path.exists(path):
        os.remove(path)

def remove_line(file_path, text_to_remove):
    if not os.path.exists(file_path):
        return
    with open(file_path, "r") as f:
        lines = f.readlines()
    with open(file_path, "w") as f:
        for line in lines:
            if text_to_remove not in line:
                f.write(line)

remove_line(os.path.join(backend_dir, "src/dto/mod.rs"), "pub mod news;")
remove_line(os.path.join(backend_dir, "src/models/mod.rs"), "pub mod news;")
remove_line(os.path.join(backend_dir, "src/repository/mod.rs"), "pub mod news_repository;")
remove_line(os.path.join(backend_dir, "src/handlers/mod.rs"), "pub mod news_handler;")
remove_line(os.path.join(backend_dir, "src/main.rs"), ".configure(handlers::news_handler::config)")

print("Backend removal script completed.")
